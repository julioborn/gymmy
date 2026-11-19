'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronDown, Play, Pause, Settings, RotateCw, Timer as TimerIcon, Trophy } from 'lucide-react';
import Swal from 'sweetalert2';
import { swalNotify } from '@/utils/swalConfig';
import { Button } from '@/components/ui/button';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { nativeTimerService } from '@/lib/nativeTimerService';

type PhaseKind = 'prep' | 'work' | 'rest' | 'restCycle';
type Phase = PhaseKind | 'idle' | 'done';
type Step = { phase: PhaseKind; duration: number; round: number; cycle: number };

const STORAGE_KEY = 'gymmy_timer_config_v1';

// Paleta: amarillo = preparate/ciclos, verde = entrenar, rojo = descansar, celeste = rondas.
const YELLOW = '#facc15';
const LIME = '#a3e635';
const RED = '#ef4444';
const BLUE = '#38bdf8';

const PHASE_LABEL: Record<PhaseKind, string> = {
    prep: 'Preparate',
    work: 'Entrenar',
    rest: 'Descansar',
    restCycle: 'Descanso entre ciclos',
};

const PHASE_COLOR: Record<PhaseKind, string> = {
    prep: YELLOW,
    work: LIME,
    rest: RED,
    restCycle: YELLOW,
};

// Series dentro de un ciclo (ejercicio + descanso) repetidas "ciclos" veces;
// entre un ciclo y el siguiente, el descanso normal se reemplaza por uno más
// largo ("descanso entre ciclos"). Con ciclos=1 el comportamiento es idéntico
// al timer simple de siempre.
function buildTimeline(prep: number, work: number, rest: number, rounds: number, cycles: number, restCycles: number): Step[] {
    const steps: Step[] = [];
    if (prep > 0) steps.push({ phase: 'prep', duration: prep, round: 0, cycle: 1 });
    for (let c = 1; c <= cycles; c++) {
        for (let i = 1; i <= rounds; i++) {
            steps.push({ phase: 'work', duration: work, round: i, cycle: c });
            const isLastRoundOverall = c === cycles && i === rounds;
            if (isLastRoundOverall) continue;
            const isLastRoundOfCycle = i === rounds;
            if (isLastRoundOfCycle) {
                if (restCycles > 0) steps.push({ phase: 'restCycle', duration: restCycles, round: i, cycle: c });
            } else {
                steps.push({ phase: 'rest', duration: rest, round: i, cycle: c });
            }
        }
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
            <span className="text-xs font-bold text-white/50 uppercase tracking-wide block mb-2">{label}</span>
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

function IntervalRow({ dotColor, label, description, value, suffix, expanded, onToggle, children }: {
    dotColor: string; label: string; description: string; value: number; suffix?: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <div className="border-b border-white/[0.06] last:border-b-0">
            <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 py-4 text-left">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: dotColor }} />
                <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-[15px] uppercase tracking-wide truncate">{label}</p>
                    <p className="text-white/40 text-[11px] font-semibold mt-0.5 truncate">{description}</p>
                </div>
                <span className="text-white font-black text-xl tabular-nums shrink-0">
                    {suffix === 'seg' ? `:${String(value).padStart(2, '0')}` : value}
                </span>
                <ChevronDown size={16} className={`text-white/30 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && <div className="pb-4">{children}</div>}
        </div>
    );
}

export default function TimerPage() {
    const [work, setWork] = useState(30);
    const [rest, setRest] = useState(15);
    const [rounds, setRounds] = useState(8);
    const [prep, setPrep] = useState(10);
    const [ciclos, setCiclos] = useState(1);
    const [restCiclos, setRestCiclos] = useState(60);

    const [showConfig, setShowConfig] = useState(true);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const toggleExpanded = (key: string) => setExpandedKey(k => k === key ? null : key);

    const [phase, setPhase] = useState<Phase>('idle');
    const [round, setRound] = useState(0);
    const [cycle, setCycle] = useState(0);
    const [remainingMs, setRemainingMs] = useState(0);
    const [paused, setPaused] = useState(false);

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
                if (c.ciclos) setCiclos(c.ciclos);
                if (c.restCiclos != null) setRestCiclos(c.restCiclos);
            }
        } catch {}
    }, []);
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ work, rest, rounds, prep, ciclos, restCiclos })); } catch {}
    }, [work, rest, rounds, prep, ciclos, restCiclos]);

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

    // Campana sintetizada: varios parciales en relaciones inarmonicas (modelo
    // tipo Risset) que decaen cada uno a su propia velocidad, en vez de un
    // solo tono puro — es lo que da el "dong" metalico de una campana real.
    const bell = useCallback((freq: number, duration = 1, vol = 0.5) => {
        try {
            const ctx = ensureAudio();
            const dest = audioDestRef.current ?? ctx.destination;
            const partials = [
                { ratio: 1, gain: 1 },
                { ratio: 2, gain: 0.55 },
                { ratio: 2.76, gain: 0.32 },
                { ratio: 3, gain: 0.22 },
                { ratio: 4.07, gain: 0.14 },
                { ratio: 5.4, gain: 0.08 },
            ];
            partials.forEach(({ ratio, gain }, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq * ratio;
                const decay = duration / (1 + i * 0.4);
                g.gain.setValueAtTime(0, ctx.currentTime);
                g.gain.linearRampToValueAtTime(vol * gain, ctx.currentTime + 0.006);
                g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);
                osc.connect(g);
                g.connect(dest);
                osc.start();
                osc.stop(ctx.currentTime + decay + 0.05);
            });
        } catch {}
    }, [ensureAudio]);

    const playPhaseSound = useCallback((p: PhaseKind | 'done') => {
        // Arranca trabajo: campana clara y brillante, un solo golpe
        if (p === 'work') bell(880, 0.85, 0.55);
        // Arranca descanso: campana mas grave y calida
        else if (p === 'rest') bell(523.25, 1.1, 0.45);
        // Arranca descanso entre ciclos: campana aun mas grave, para distinguirla del descanso normal
        else if (p === 'restCycle') bell(392, 1.3, 0.5);
        else if (p === 'prep') beep(660, 0.12, 0.45, 'sine');
        // Fin del entrenamiento completo: doble campana triunfal
        else if (p === 'done') {
            bell(659.25, 1.0, 0.6);
            setTimeout(() => bell(880, 1.3, 0.65), 260);
        }
    }, [bell, beep]);

    // ── Live Activity / Dynamic Island (solo iOS) ──
    const endLiveActivity = useCallback(() => {
        if (!isIOSNativeRef.current) return;
        import('@/plugins/LiveActivity').then(({ default: LiveActivity }) => LiveActivity.end()).catch(() => {});
    }, []);

    const updateLiveActivity = useCallback((
        phase: PhaseKind | 'done', round: number, phaseEndsAt: number, progress: number, start: boolean,
    ) => {
        if (!isIOSNativeRef.current) return;
        // El plugin nativo de iOS solo conoce prep/work/rest/done (para color e icono);
        // "restCycle" se manda como "rest" para que siga funcionando, con el texto real en phaseLabel.
        const nativePhase = phase === 'restCycle' ? 'rest' : phase;
        const phaseLabel = phase === 'done' ? '¡Listo!' : PHASE_LABEL[phase];
        import('@/plugins/LiveActivity').then(({ default: LiveActivity }) => {
            const payload = { phase: nativePhase, phaseLabel, round, totalRounds: rounds, phaseEndsAt, progress };
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
        setCycle(step.cycle);
        setRemainingMs(step.duration * 1000);
        lastTickSecondRef.current = null;
        playPhaseSound(step.phase);
        updateLiveActivity(step.phase, step.round, phaseEndRef.current, progressAtStep(idx), idx === 0);
    }, [playPhaseSound, releaseWakeLock, updateLiveActivity, progressAtStep]);

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
        const steps = buildTimeline(prep, work, rest, rounds, ciclos, restCiclos);
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
        setCycle(0);
        setRemainingMs(0);
        setPaused(false);
        stepsRef.current = [];
        stepIdxRef.current = 0;
        releaseWakeLock();
        endLiveActivity();
        nativeTimerService.stop();
    };

    // Arranca de cero el mismo entrenamiento (misma config), sin pasar por la pantalla de ajustes.
    const handleRestart = () => {
        handleReset();
        handleStart();
    };

    const totalRounds = rounds;
    const totalRoundsAll = rounds * ciclos;

    // Al terminar, un swal con el resumen.
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
                            <div style="font-size:2.5rem;font-weight:900;color:${LIME};line-height:1;">${totalRoundsAll}</div>
                            <div style="color:rgba(255,255,255,0.5);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">rondas completadas</div>
                            ${ciclos > 1 ? `
                            <div style="margin-top:0.6rem;font-size:1.3rem;font-weight:800;color:${YELLOW};line-height:1;">${ciclos}</div>
                            <div style="color:rgba(255,255,255,0.5);font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">ciclos completados</div>
                            ` : ''}
                            <div style="margin-top:0.9rem;font-size:1.3rem;font-weight:800;color:${BLUE};line-height:1;">${fmtClock(work * totalRoundsAll)}</div>
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

    // Mientras no arrancó, se previsualiza la primera fase (duración completa, sin descontar).
    const previewSteps = phase === 'idle' ? buildTimeline(prep, work, rest, rounds, ciclos, restCiclos) : [];
    const activePhase: PhaseKind = phase === 'idle' ? (previewSteps[0]?.phase ?? 'prep') : (phase === 'done' ? 'work' : phase);
    const displayColor = PHASE_COLOR[activePhase];
    const displayLabel = PHASE_LABEL[activePhase];
    const displaySecondsLeft = phase === 'idle' ? (previewSteps[0]?.duration ?? 0) : secondsLeft;
    const nextStep: Step | undefined = phase === 'idle' ? previewSteps[1] : stepsRef.current[stepIdxRef.current + 1];
    const totalRemainingMs = phase === 'done'
        ? 0
        : phase === 'idle'
            ? previewSteps.reduce((s, st) => s + st.duration, 0) * 1000
            : remainingMs + stepsRef.current.slice(stepIdxRef.current + 1).reduce((s, st) => s + st.duration, 0) * 1000;
    const roundsRestantes = round === 0 ? totalRounds : totalRounds - round + 1;
    const ciclosRestantes = cycle === 0 ? ciclos : ciclos - cycle + 1;

    // ── Pantalla de configuración ("Intervalos") ──
    if (showConfig) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pb-10">
                <div className="fixed inset-0 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all shrink-0">
                            <ChevronLeft size={18} />
                        </Link>
                        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
                            <TimerIcon size={20} style={{ color: LIME }} className="shrink-0" />
                            <h1 className="text-white font-bold text-2xl truncate">Intervalos</h1>
                        </div>
                        <div className="w-9 h-9 shrink-0" />
                    </div>

                    <div className="rounded-3xl overflow-hidden px-5"
                        style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <IntervalRow dotColor={YELLOW} label="Preparate" description="Cuenta atrás antes de empezar"
                            value={prep} suffix="seg" expanded={expandedKey === 'prep'} onToggle={() => toggleExpanded('prep')}>
                            <ConfigRow label="Duración" value={prep} onChange={setPrep} min={0} max={60} step={5} accent={YELLOW} suffix="seg" />
                        </IntervalRow>
                        <IntervalRow dotColor={LIME} label="Entrenar" description="Hacer ejercicios durante este tiempo"
                            value={work} suffix="seg" expanded={expandedKey === 'work'} onToggle={() => toggleExpanded('work')}>
                            <ConfigRow label="Duración" value={work} onChange={setWork} min={5} max={300} step={5} accent={LIME} suffix="seg" />
                        </IntervalRow>
                        <IntervalRow dotColor={RED} label="Descansar" description="Descansar durante este tiempo"
                            value={rest} suffix="seg" expanded={expandedKey === 'rest'} onToggle={() => toggleExpanded('rest')}>
                            <ConfigRow label="Duración" value={rest} onChange={setRest} min={0} max={180} step={5} accent={RED} suffix="seg" />
                        </IntervalRow>
                        <IntervalRow dotColor={BLUE} label="Rondas" description="Una ronda es ejercicio + descanso"
                            value={rounds} expanded={expandedKey === 'rounds'} onToggle={() => toggleExpanded('rounds')}>
                            <ConfigRow label="Cantidad" value={rounds} onChange={setRounds} min={1} max={30} step={1} accent={BLUE} />
                        </IntervalRow>
                        <IntervalRow dotColor={YELLOW} label="Ciclos" description={`Un ciclo son ${rounds} ${rounds === 1 ? 'ronda' : 'rondas'}`}
                            value={ciclos} expanded={expandedKey === 'ciclos'} onToggle={() => toggleExpanded('ciclos')}>
                            <ConfigRow label="Cantidad" value={ciclos} onChange={setCiclos} min={1} max={20} step={1} accent={YELLOW} />
                        </IntervalRow>
                        <IntervalRow dotColor={YELLOW} label="Desc. entre ciclos" description="Intervalo de recuperación"
                            value={restCiclos} suffix="seg" expanded={expandedKey === 'restCiclos'} onToggle={() => toggleExpanded('restCiclos')}>
                            <ConfigRow label="Duración" value={restCiclos} onChange={setRestCiclos} min={0} max={300} step={5} accent={YELLOW} suffix="seg" disabled={ciclos <= 1} />
                        </IntervalRow>
                    </div>

                    <Button onClick={() => setShowConfig(false)}
                        className="h-14 rounded-2xl font-black text-base uppercase tracking-wide active:scale-[0.98] transition-transform"
                        style={{ background: LIME, color: '#000' }}>
                        Listo
                    </Button>
                </div>
            </div>
        );
    }

    // ── Pantalla de ejecución ──
    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-10">
            <div className="fixed inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative max-w-md mx-auto px-4 pt-4 flex flex-col gap-3">
                <div className="rounded-[1.75rem] overflow-hidden border border-white/[0.08]">

                    {/* Header: ajustes, tiempo total, reiniciar */}
                    <div className="flex items-center justify-between px-4 py-3" style={{ background: '#111113' }}>
                        <button type="button" onClick={() => { handleReset(); setShowConfig(true); }}
                            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all shrink-0">
                            <Settings size={16} />
                        </button>
                        <div className="text-center leading-tight">
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Intermitente</p>
                            <p className="text-xl font-black tabular-nums" style={{ color: phase === 'done' ? LIME : displayColor }}>
                                {fmtClock(Math.ceil(totalRemainingMs / 1000))}
                            </p>
                        </div>
                        {phase !== 'idle' ? (
                            <button type="button" onClick={handleRestart}
                                className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all shrink-0">
                                <RotateCw size={16} />
                            </button>
                        ) : <div className="w-9 h-9 shrink-0" />}
                    </div>

                    {/* Fase actual: bloque de color a pantalla completa */}
                    {phase === 'done' ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 done-pop"
                            style={{ background: 'linear-gradient(135deg, #10b981, #a3e635)' }}>
                            <Trophy size={48} className="text-black" />
                            <span className="text-black font-black text-3xl uppercase tracking-wide">¡Listo!</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center" style={{ background: displayColor }}>
                            <span className="text-black font-black text-3xl uppercase tracking-[0.08em]">{displayLabel}</span>
                            <span className="text-black font-black tabular-nums leading-none" style={{ fontSize: 'clamp(76px, 23vw, 108px)' }}>
                                {fmtClock(displaySecondsLeft)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Previsualización de la próxima fase */}
                {nextStep && phase !== 'done' && (
                    <div className="mx-auto px-7 py-3 rounded-full" style={{ background: PHASE_COLOR[nextStep.phase] }}>
                        <span className="text-black font-black text-lg uppercase tracking-wide whitespace-nowrap">
                            {PHASE_LABEL[nextStep.phase]} · {fmtClock(nextStep.duration)}
                        </span>
                    </div>
                )}

                <div className="rounded-[1.75rem] overflow-hidden border border-white/[0.08]">
                    {/* Rondas / Play-Pausa / Ciclos */}
                    <div className="grid grid-cols-3 items-center px-4 py-7" style={{ background: '#111113' }}>
                        <div className="text-left">
                            <NumberTicker value={roundsRestantes} className="text-4xl font-black block" style={{ color: BLUE }} />
                            <p className="text-[10px] font-bold uppercase tracking-wide text-white/40 mt-1">Rondas restantes</p>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            {!isRunning && phase !== 'done' && (
                                <>
                                    <Button onClick={handleStart}
                                        className="h-16 w-16 rounded-full p-0 active:scale-90 transition-transform"
                                        style={{ background: LIME, boxShadow: `0 10px 28px -10px ${LIME}aa` }}>
                                        <Play size={26} className="text-black ml-1" fill="currentColor" />
                                    </Button>
                                    <span className="text-sm font-black uppercase tracking-wide text-white/70">Empezar</span>
                                </>
                            )}
                            {isRunning && !paused && (
                                <>
                                    <Button onClick={handlePause}
                                        className="h-16 w-16 rounded-full p-0 active:scale-90 transition-transform"
                                        style={{ background: RED, boxShadow: `0 10px 28px -10px ${RED}aa` }}>
                                        <Pause size={24} className="text-white" fill="currentColor" />
                                    </Button>
                                    <span className="text-sm font-black uppercase tracking-wide text-white/70">Pausar</span>
                                </>
                            )}
                            {isRunning && paused && (
                                <>
                                    <Button onClick={handleResume}
                                        className="h-16 w-16 rounded-full p-0 active:scale-90 transition-transform"
                                        style={{ background: LIME, boxShadow: `0 10px 28px -10px ${LIME}aa` }}>
                                        <Play size={26} className="text-black ml-1" fill="currentColor" />
                                    </Button>
                                    <span className="text-sm font-black uppercase tracking-wide text-white/70">Reanudar</span>
                                </>
                            )}
                            {phase === 'done' && <div className="h-16 w-16" />}
                        </div>

                        {ciclos > 1 ? (
                            <div className="text-right">
                                <NumberTicker value={ciclosRestantes} className="text-4xl font-black block ml-auto" style={{ color: YELLOW }} />
                                <p className="text-[10px] font-bold uppercase tracking-wide text-white/40 mt-1">Ciclos restantes</p>
                            </div>
                        ) : <div />}
                    </div>
                </div>
            </div>
        </div>
    );
}
