'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCircularProgressBar } from '@/components/magicui/animated-circular-progress-bar';
import { NumberTicker } from '@/components/magicui/number-ticker';

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

    const stepsRef = useRef<Step[]>([]);
    const stepIdxRef = useRef(0);
    const phaseEndRef = useRef(0);
    const pausedRemainingRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
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

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); releaseWakeLock(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Mantener la pantalla encendida mientras corre ──
    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator) wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch {}
    }, []);

    const releaseWakeLock = useCallback(() => {
        try { wakeLockRef.current?.release(); } catch {}
        wakeLockRef.current = null;
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

    // ── Sound ──
    const ensureAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
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
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration + 0.02);
        } catch {}
    }, [ensureAudio]);

    const playPhaseSound = useCallback((p: PhaseKind | 'done') => {
        // Fin de descanso / arranca trabajo: doble beep agudo y marcado
        if (p === 'work') { beep(1050, 0.16, 0.8, 'square'); setTimeout(() => beep(1050, 0.18, 0.8, 'square'), 170); }
        // Fin de trabajo / arranca descanso: doble beep grave y marcado
        else if (p === 'rest') { beep(520, 0.18, 0.75, 'square'); setTimeout(() => beep(520, 0.2, 0.75, 'square'), 190); }
        else if (p === 'prep') beep(660, 0.12, 0.45);
        else if (p === 'done') { beep(880, 0.14, 0.7, 'square'); setTimeout(() => beep(1050, 0.14, 0.7, 'square'), 150); setTimeout(() => beep(1250, 0.26, 0.8, 'square'), 300); }
    }, [beep]);

    // ── Core loop ──
    const goToStep = useCallback((idx: number, startAt: number) => {
        const steps = stepsRef.current;
        if (idx >= steps.length) {
            setPhase('done');
            setRemainingMs(0);
            playPhaseSound('done');
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            releaseWakeLock();
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
    }, [playPhaseSound, releaseWakeLock]);

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
    };

    const handleResume = () => {
        phaseEndRef.current = Date.now() + Math.max(0, pausedRemainingRef.current);
        setPaused(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, 100);
        requestWakeLock();
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
    };

    const isRunning = phase !== 'idle' && phase !== 'done';
    const totalRounds = rounds;
    const secondsLeft = Math.ceil(remainingMs / 1000);
    const color = PHASE_COLOR[phase];
    const pct = phase === 'done' ? 100 : (currentDuration > 0 ? Math.max(0, Math.min(100, (remainingMs / 1000 / currentDuration) * 100)) : 0);
    const showRound = phase === 'work' || phase === 'rest';
    const pulseKey = `${phase}-${round}`;

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-20">
            <div className="fixed inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative max-w-md mx-auto px-4 pt-4 space-y-5">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all">
                        <ChevronLeft size={18} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <TimerIcon size={20} style={{ color: LIME }} />
                        <h1 className="text-white font-bold text-2xl">Timer Intermitente</h1>
                    </div>
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
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
                            <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color }}>{PHASE_LABEL[phase]}</span>
                            <span className="font-black text-white tabular-nums leading-none mt-2" style={{ fontSize: 'clamp(58px, 18vw, 80px)' }}>
                                {isRunning || phase === 'done' ? fmtClock(phase === 'done' ? 0 : secondsLeft) : '--:--'}
                            </span>
                            {showRound && (
                                <span className="text-white text-xl font-bold mt-3">
                                    Ronda <NumberTicker value={round} className="text-white font-black" style={{ color }} /> <span className="text-white/50">de {totalRounds}</span>
                                </span>
                            )}
                            {phase === 'done' && (
                                <span className="text-white text-xl font-bold mt-3">
                                    <NumberTicker value={totalRounds} className="text-white font-black" /> <span className="text-white/50">rondas completadas</span>
                                </span>
                            )}
                        </div>
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

                <p className="text-white/25 text-xs text-center px-4">
                    Mantené la app abierta y la pantalla encendida durante el ejercicio para que los avisos sonoros funcionen bien.
                </p>
            </div>
        </div>
    );
}
