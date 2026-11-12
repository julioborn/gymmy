'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play, Pause, RotateCcw, Timer as TimerIcon, Trophy } from 'lucide-react';
import Swal from 'sweetalert2';
import { swalNotify } from '@/utils/swalConfig';
import { Button } from '@/components/ui/button';
import { AnimatedCircularProgressBar } from '@/components/magicui/animated-circular-progress-bar';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { nativeTimerService } from '@/lib/nativeTimerService';

type PhaseKind = 'prep' | 'work' | 'rest';
type Phase = PhaseKind | 'idle' | 'done';
type Step = { phase: PhaseKind; duration: number; round: number };

const STORAGE_KEY = 'gymmy_timer_config_v1';

// Paleta de marca de SportTime — el resto de la app ya usa este mismo par.
const LIME = '#a3e635';
const ORANGE = '#f97316';
const NEUTRAL = '#cbd5e1';

const PHASE_LABEL: Record<Phase, string> = {
    idle: 'Listo para arrancar',
    prep: 'Preparate',
    work: 'Trabajo',
    rest: 'Descanso',
    done: '¡Listo!',
};

const PHASE_COLOR: Record<Phase, string> = {
    idle: NEUTRAL,
    prep: NEUTRAL,
    work: LIME,
    rest: ORANGE,
    done: LIME,
};

function buildTimeline(prep: number, work: number, rest: number, rounds: number): Step[] {
    const steps: Step[] = [];
    if (prep > 0) steps.push({ phase: 'prep', duration: prep, round: 0 });
    for (let i = 1; i <= rounds; i++) {
        steps.push({ phase: 'work', duration: work, round: i });
        if (i < rounds) steps.push({ phase: 'rest', duration: rest, round: i });
    }
    return steps;
}

function fmtClock(totalSeconds: number): string {
    const s = Math.max(0, totalSeconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

function ConfigRow({ label, value, onChange, min, max, step, accent, suffix, disabled }: {
    label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; accent: string; suffix?: string; disabled?: boolean;
}) {
    // Valor en un ref para que el acelerador de mantener-presionado siempre
    // sume sobre el último valor real, sin esperar a que el prop se actualice.
    const valueRef = useRef(value);
    useEffect(() => { valueRef.current = value; }, [value]);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stepOnce = (dir: 1 | -1) => {
        const next = Math.max(min, Math.min(max, valueRef.current + dir * step));
        valueRef.current = next;
        onChange(next);
    };

    const stopHold = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        timeoutRef.current = null;
        intervalRef.current = null;
    };

    const startHold = (dir: 1 | -1) => {
        stepOnce(dir);
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => stepOnce(dir), 80);
        }, 420);
    };

    useEffect(() => stopHold, []);

    return (
        <div className={`transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <span className="text-sm font-semibold text-white/80 block mb-2">{label}</span>
            <div className="flex items-center gap-2">
                <button type="button"
                    onPointerDown={() => startHold(-1)}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    disabled={disabled || value <= min}
                    className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-xl font-bold text-white active:scale-90 disabled:opacity-30 transition-transform"
                    style={{ background: `${accent}1F`, border: `1px solid ${accent}40` }}>
                    −
                </button>
                <div className="flex-1 min-w-0 h-11 rounded-2xl flex flex-col items-center justify-center leading-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-xl font-black tabular-nums" style={{ color: accent }}>{value}</span>
                    {suffix && <span className="text-white/30 text-[10px] font-semibold mt-0.5">{suffix}</span>}
                </div>
                <button type="button"
                    onPointerDown={() => startHold(1)}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    disabled={disabled || value >= max}
                    className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-xl font-bold text-white active:scale-90 disabled:opacity-30 transition-transform"
                    style={{ background: `${accent}1F`, border: `1px solid ${accent}40` }}>
                    +
                </button>
            </div>
        </div>
    );
}

export default function TimerPage() {
    const [work, setWork] = useState(30);
    const [rest, setRest] = useState(15);
    const [rounds, setRounds] = useState(8);
    const [prep, setPrep] = useState(10);

    const [phase, setPhase] = useState<Phase>('idle');
    const [round, setRound] = useState(0);
    const [remainingMs, setRemainingMs] = useState(0);
    const [currentDuration, setCurrentDuration] = useState(0);
    const [paused, setPaused] = useState(false);
    const [snapRing, setSnapRing] = useState(false);

    const stepsRef = useRef<Step[]>([]);
    const stepIdxRef = useRef(0);
    const phaseEndRef = useRef(0);
    const pausedRemainingRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const isIOSNativeRef = useRef(false);
    const lastTickSecondRef = useRef<number | null>(null);
    const wakeLockRef = useRef<any>(null);
    const runningRef = useRef(false);

    // ── Config persistence ──
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const c = JSON.parse(raw);
                if (c.work) setWork(c.work);
                if (c.rest) setRest(c.rest);
                if (c.rounds) setRounds(c.rounds);
                if (c.prep != null) setPrep(c.prep);
            }
        } catch {}
    }, []);
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ work, rest, rounds, prep })); } catch {}
    }, [work, rest, rounds, prep]);

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); releaseWakeLock(); endLiveActivity(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Mantener la pantalla encendida mientras corre ──
    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator) wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch {}
        // navigator.wakeLock no es confiable dentro del WKWebView de iOS,
        // asi que ademas pedimos el idle timer nativo en esa plataforma.
        if (isIOSNativeRef.current) {
            try {
                const { default: KeepAwake } = await import('@/plugins/KeepAwake');
                await KeepAwake.keepAwake();
            } catch {}
        }
    }, []);

    const releaseWakeLock = useCallback(() => {
        try { wakeLockRef.current?.release(); } catch {}
        wakeLockRef.current = null;
        if (isIOSNativeRef.current) {
            import('@/plugins/KeepAwake').then(({ default: KeepAwake }) => KeepAwake.allowSleep()).catch(() => {});
        }
    }, []);

    useEffect(() => {
        runningRef.current = phase !== 'idle' && phase !== 'done' && !paused;
    }, [phase, paused]);

    // El wake lock se libera solo cuando la pestaña se oculta (se cambia de app, se apaga la pantalla);
    // al volver, si el timer sigue corriendo, lo volvemos a pedir.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && runningRef.current) requestWakeLock();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [requestWakeLock]);

    // ── Android: si se oculta la app mientras corre, el foreground service nativo
    // toma la posta (notificacion + beeps); al volver, lo paramos y sigue el JS. ──
    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                if (!runningRef.current) return;
                const steps = stepsRef.current;
                const idx = stepIdxRef.current;
                if (idx >= steps.length) return;
                const remainingMs = Math.max(0, phaseEndRef.current - Date.now());
                const resumeSteps = [
                    { ...steps[idx], duration: Math.ceil(remainingMs / 1000) },
                    ...steps.slice(idx + 1),
                ];
                nativeTimerService.start(resumeSteps, Date.now());
            } else {
                nativeTimerService.stop();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    // ── Sound ──
    useEffect(() => {
        (async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                isIOSNativeRef.current = Capacitor.getPlatform() === 'ios';
            } catch {}
        })();
    }, []);

    const ensureAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            audioCtxRef.current = ctx;
            // iOS (WKWebView): un oscilador conectado directo a ctx.destination
            // sigue respetando el switch de silencio aunque la sesion nativa
            // este en modo "playback" — eso solo bypassea <audio>/<video>
            // reales. Enrutamos el audio generado a un <audio> real via
            // MediaStreamDestination para que sí ignore el silencio.
            if (isIOSNativeRef.current && 'createMediaStreamDestination' in ctx) {
                const dest = ctx.createMediaStreamDestination();
                audioDestRef.current = dest;
                const el = new Audio();
                el.srcObject = dest.stream;
                el.play().catch(() => {});
                audioElRef.current = el;
                // Sin esto, cuando el grafo de audio queda sin ninguna fuente
                // activa (silencio entre beeps, timer en pausa), WebKit hace
                // clickear/tildar el <audio> que reproduce el MediaStream.
                // Un oscilador a volumen 0 lo mantiene "vivo" todo el tiempo.
                const keepAliveGain = ctx.createGain();
                keepAliveGain.gain.value = 0;
                const keepAliveOsc = ctx.createOscillator();
                keepAliveOsc.frequency.value = 20;
                keepAliveOsc.connect(keepAliveGain);
                keepAliveGain.connect(dest);
                keepAliveOsc.start();
            }
        }
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        if (audioElRef.current?.paused) audioElRef.current.play().catch(() => {});
        return audioCtxRef.current;
    }, []);

    const beep = useCallback((freq: number, duration: number, vol = 0.4, type: OscillatorType = 'sine') => {
        try {
            const ctx = ensureAudio();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioDestRef.current ?? ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration + 0.02);
        } catch {}
    }, [ensureAudio]);

    const playPhaseSound = useCallback((p: PhaseKind | 'done') => {
        // Arranca trabajo: check prolijo, dos notas ascendentes suaves
        if (p === 'work') {
            beep(880, 0.1, 0.5, 'sine');
            setTimeout(() => beep(1318.5, 0.18, 0.55, 'sine'), 90);
        }
        // Arranca descanso: tono calido y descendente, mas relajado
        else if (p === 'rest') {
            beep(659.25, 0.22, 0.4, 'sine');
            setTimeout(() => beep(440, 0.34, 0.35, 'sine'), 150);
        }
        else if (p === 'prep') beep(660, 0.12, 0.45, 'sine');
        // Fin del entrenamiento completo: pequeña fanfarria ascendente
        else if (p === 'done') {
            beep(523.25, 0.14, 0.6, 'sine');
            setTimeout(() => beep(659.25, 0.14, 0.6, 'sine'), 140);
            setTimeout(() => beep(783.99, 0.14, 0.65, 'sine'), 280);
            setTimeout(() => beep(1046.5, 0.36, 0.75, 'sine'), 420);
        }
    }, [beep]);

    // ── Live Activity / Dynamic Island (solo iOS) ──
    const endLiveActivity = useCallback(() => {
        if (!isIOSNativeRef.current) return;
        import('@/plugins/LiveActivity').then(({ default: LiveActivity }) => LiveActivity.end()).catch(() => {});
    }, []);

    const updateLiveActivity = useCallback((
        phase: 'prep' | 'work' | 'rest' | 'done', round: number, phaseEndsAt: number, progress: number, start: boolean,
    ) => {
        if (!isIOSNativeRef.current) return;
        import('@/plugins/LiveActivity').then(({ default: LiveActivity }) => {
            const payload = { phase, phaseLabel: PHASE_LABEL[phase], round, totalRounds: rounds, phaseEndsAt, progress };
            return start ? LiveActivity.start(payload) : LiveActivity.update(payload);
        }).catch((e) => console.error('[LiveActivity]', e));
    }, [rounds]);

    // Progreso 0..1 del entrenamiento completo a partir de la duracion total
    // planificada, no solo de la ronda — asi la barra en la Dynamic Island
    // avanza en proporcion real aunque trabajo/descanso tengan duraciones distintas.
    const progressAtStep = useCallback((idx: number) => {
        const steps = stepsRef.current;
        const total = steps.reduce((sum, s) => sum + s.duration, 0);
        if (total <= 0) return 0;
        const elapsed = steps.slice(0, idx).reduce((sum, s) => sum + s.duration, 0);
        return Math.max(0, Math.min(1, elapsed / total));
    }, []);

    // ── Core loop ──
    const goToStep = useCallback((idx: number, startAt: number) => {
        const steps = stepsRef.current;
        if (idx >= steps.length) {
            setPhase('done');
            setRemainingMs(0);
            playPhaseSound('done');
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            releaseWakeLock();
            updateLiveActivity('done', steps[steps.length - 1]?.round ?? 0, Date.now(), 1, false);
            nativeTimerService.stop();
            return;
        }
        const step = steps[idx];
        stepIdxRef.current = idx;
        phaseEndRef.current = startAt + step.duration * 1000;
        setPhase(step.phase);
        setRound(step.round);
        setRemainingMs(step.duration * 1000);
        setCurrentDuration(step.duration);
        lastTickSecondRef.current = null;
        playPhaseSound(step.phase);
        updateLiveActivity(step.phase, step.round, phaseEndRef.current, progressAtStep(idx), idx === 0);
        // El anillo arranca de cero sin la animacion de 1s, para que no se vea
        // "rebobinando" desde el final de la fase anterior.
        setSnapRing(true);
    }, [playPhaseSound, releaseWakeLock, updateLiveActivity]);

    useEffect(() => {
        if (!snapRing) return;
        const t = setTimeout(() => setSnapRing(false), 60);
        return () => clearTimeout(t);
    }, [snapRing]);

    const tick = useCallback(() => {
        const remaining = phaseEndRef.current - Date.now();
        if (remaining <= 0) {
            goToStep(stepIdxRef.current + 1, phaseEndRef.current);
            return;
        }
        setRemainingMs(remaining);
        const secLeft = Math.ceil(remaining / 1000);
        if (secLeft <= 3 && secLeft !== lastTickSecondRef.current) {
            lastTickSecondRef.current = secLeft;
            beep(1000, 0.09, 0.4);
        }
    }, [beep, goToStep]);

    const handleStart = () => {
        ensureAudio();
        const steps = buildTimeline(prep, work, rest, rounds);
        if (!steps.length) return;
        stepsRef.current = steps;
        setPaused(false);
        const now = Date.now();
        goToStep(0, now);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, 100);
        requestWakeLock();
    };

    const handlePause = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        pausedRemainingRef.current = phaseEndRef.current - Date.now();
        setPaused(true);
        releaseWakeLock();
        // Se cierra la Live Activity porque su countdown nativo seguiria
        // corriendo solo aunque el timer este pausado; se reabre al resumir.
        endLiveActivity();
    };

    const handleResume = () => {
        phaseEndRef.current = Date.now() + Math.max(0, pausedRemainingRef.current);
        setPaused(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, 100);
        requestWakeLock();
        const step = stepsRef.current[stepIdxRef.current];
        if (step) updateLiveActivity(step.phase, step.round, phaseEndRef.current, progressAtStep(stepIdxRef.current), true);
    };

    const handleReset = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        setPhase('idle');
        setRound(0);
        setRemainingMs(0);
        setCurrentDuration(0);
        setPaused(false);
        stepsRef.current = [];
        stepIdxRef.current = 0;
        releaseWakeLock();
        endLiveActivity();
        setSnapRing(true);
        nativeTimerService.stop();
    };

    const totalRounds = rounds;

    // Al terminar, un swal con el resumen (no texto apretado adentro del anillo).
    const doneAlertShownRef = useRef(false);
    useEffect(() => {
        if (phase === 'done' && !doneAlertShownRef.current) {
            doneAlertShownRef.current = true;
            const t = setTimeout(() => {
                Swal.fire({
                    ...swalNotify,
                    title: '¡Entrenamiento completo!',
                    html: `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:0.25rem;padding-bottom:1.5rem;">
                            <div style="font-size:2.5rem;font-weight:900;color:${LIME};line-height:1;">${totalRounds}</div>
                            <div style="color:rgba(255,255,255,0.5);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">rondas completadas</div>
                            <div style="margin-top:0.9rem;font-size:1.3rem;font-weight:800;color:${ORANGE};line-height:1;">${fmtClock(work * totalRounds)}</div>
                            <div style="color:rgba(255,255,255,0.5);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">de trabajo total</div>
                        </div>
                    `,
                    confirmButtonText: 'Listo',
                }).then(() => { handleReset(); });
            }, 250);
            return () => clearTimeout(t);
        }
        if (phase !== 'done') doneAlertShownRef.current = false;
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    const isRunning = phase !== 'idle' && phase !== 'done';
    const secondsLeft = Math.ceil(remainingMs / 1000);
    const color = PHASE_COLOR[phase];
    // Como las agujas de un reloj: el anillo crece de menos a más a medida que pasa el tiempo.
    const pct = phase === 'done' ? 100 : (currentDuration > 0 ? Math.max(0, Math.min(100, ((currentDuration - remainingMs / 1000) / currentDuration) * 100)) : 0);
    const showRound = phase === 'work' || phase === 'rest';
    const pulseKey = `${phase}-${round}`;

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-20">
            <div className="fixed inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative max-w-md mx-auto px-4 pt-4 space-y-5">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all shrink-0">
                        <ChevronLeft size={18} />
                    </Link>
                    <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
                        <TimerIcon size={20} style={{ color: LIME }} className="shrink-0" />
                        <h1 className="text-white font-bold text-2xl truncate">Intermitente</h1>
                    </div>
                    <div className="w-9 h-9 shrink-0" />
                </div>

                {/* Dial */}
                <div className="flex justify-center py-2">
                    <div className="relative" style={{ width: 288, height: 288 }}>
                        {phase !== 'idle' && (
                            <div key={pulseKey} className="absolute inset-0 rounded-full timer-pulse-ring pointer-events-none" style={{ border: `3px solid ${color}` }} />
                        )}
                        <AnimatedCircularProgressBar
                            className="size-72"
                            value={pct}
                            max={100}
                            gaugePrimaryColor={color}
                            gaugeSecondaryColor="rgba(255,255,255,0.08)"
                            transitionLength={snapRing ? '0s' : '1s'}
                        />
                        {phase === 'done' ? (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none done-pop">
                                <div className="w-24 h-24 rounded-full flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #a3e635)', boxShadow: '0 0 0 1px rgba(163,230,53,0.2) inset, 0 10px 30px -6px rgba(163,230,53,0.55)' }}>
                                    <Trophy size={42} className="text-black" />
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
                                <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color }}>{PHASE_LABEL[phase]}</span>
                                <span className="font-black text-white tabular-nums leading-none mt-2" style={{ fontSize: 'clamp(58px, 18vw, 80px)' }}>
                                    {isRunning ? fmtClock(secondsLeft) : '--:--'}
                                </span>
                                {showRound && (
                                    <span className="text-white text-xl font-bold mt-3">
                                        Ronda <NumberTicker value={round} className="text-white font-black" style={{ color }} /> <span className="text-white/50">de {totalRounds}</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Controles */}
                <div className="flex items-center justify-center gap-4">
                    {!isRunning && phase !== 'done' && (
                        <Button onClick={handleStart}
                            className="h-16 w-16 rounded-full p-0 active:scale-90 transition-transform"
                            style={{ background: LIME, boxShadow: `0 10px 28px -10px ${LIME}aa` }}>
                            <Play size={26} className="text-black ml-1" fill="currentColor" />
                        </Button>
                    )}
                    {isRunning && !paused && (
                        <Button onClick={handlePause}
                            className="h-16 w-16 rounded-full p-0 active:scale-90 transition-transform"
                            style={{ background: ORANGE, boxShadow: `0 10px 28px -10px ${ORANGE}aa` }}>
                            <Pause size={24} className="text-black" fill="currentColor" />
                        </Button>
                    )}
                    {isRunning && paused && (
                        <Button onClick={handleResume}
                            className="h-16 w-16 rounded-full p-0 active:scale-90 transition-transform"
                            style={{ background: LIME, boxShadow: `0 10px 28px -10px ${LIME}aa` }}>
                            <Play size={26} className="text-black ml-1" fill="currentColor" />
                        </Button>
                    )}
                    {(isRunning || phase === 'done') && (
                        <Button onClick={handleReset} variant="outline"
                            className="h-14 w-14 rounded-full p-0 border-white/15 bg-white/[0.05] hover:bg-white/10 active:scale-90 transition-transform">
                            <RotateCcw size={20} className="text-white/70" />
                        </Button>
                    )}
                </div>

                {/* Config */}
                <div className="rounded-3xl p-5 space-y-4"
                    style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wide">Configuración</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                        <ConfigRow label="Trabajo" value={work} onChange={setWork} min={5} max={300} step={5} accent={LIME} suffix="seg" disabled={isRunning} />
                        <ConfigRow label="Descanso" value={rest} onChange={setRest} min={0} max={180} step={5} accent={ORANGE} suffix="seg" disabled={isRunning} />
                        <ConfigRow label="Series" value={rounds} onChange={setRounds} min={1} max={30} step={1} accent={LIME} disabled={isRunning} />
                        <ConfigRow label="Preparación" value={prep} onChange={setPrep} min={0} max={60} step={5} accent={ORANGE} suffix="seg" disabled={isRunning} />
                    </div>
                </div>
            </div>
        </div>
    );
}
