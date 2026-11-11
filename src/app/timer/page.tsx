'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react';

type PhaseKind = 'prep' | 'work' | 'rest';
type Phase = PhaseKind | 'idle' | 'done';
type Step = { phase: PhaseKind; duration: number; round: number };

const STORAGE_KEY = 'gymmy_timer_config_v1';

const PHASE_LABEL: Record<Phase, string> = {
    idle: 'Listo para arrancar',
    prep: 'Preparate',
    work: 'Trabajo',
    rest: 'Descanso',
    done: '¡Listo!',
};

const PHASE_COLOR: Record<Phase, string> = {
    idle: '#94a3b8',
    prep: '#f59e0b',
    work: '#10b981',
    rest: '#0ea5e9',
    done: '#a3e635',
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

const WHEEL_ITEM_H = 34;
const WHEEL_VISIBLE = 3;

function WheelPicker({ label, value, onChange, min, max, step = 1, disabled }: {
    label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; disabled?: boolean;
}) {
    const options = useMemo(() => {
        const arr: number[] = [];
        for (let v = min; v <= max; v += step) arr.push(v);
        return arr;
    }, [min, max, step]);

    const containerRef = useRef<HTMLDivElement>(null);
    const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const programmaticRef = useRef(false);
    const padding = WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2);

    const scrollToValue = useCallback((v: number, smooth: boolean) => {
        const el = containerRef.current;
        const idx = options.indexOf(v);
        if (!el || idx === -1) return;
        programmaticRef.current = true;
        el.scrollTo({ top: idx * WHEEL_ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
        setTimeout(() => { programmaticRef.current = false; }, smooth ? 300 : 50);
    }, [options]);

    useEffect(() => { scrollToValue(value, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleScroll = () => {
        if (settleRef.current) clearTimeout(settleRef.current);
        settleRef.current = setTimeout(() => {
            const el = containerRef.current;
            if (programmaticRef.current || !el) return;
            const idx = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_H)));
            const newVal = options[idx];
            if (newVal !== value) onChange(newVal);
            scrollToValue(newVal, true);
        }, 110);
    };

    return (
        <div className="flex-1">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wide mb-1 block text-center">{label}</label>
            <div className={`relative ${disabled ? 'opacity-40 pointer-events-none' : ''}`} style={{ height: WHEEL_ITEM_H * WHEEL_VISIBLE }}>
                <div className="absolute left-0 right-0 rounded-lg bg-white/[0.1] pointer-events-none" style={{ top: padding, height: WHEEL_ITEM_H }} />
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden"
                    style={{ scrollSnapType: 'y mandatory', paddingTop: padding, paddingBottom: padding, scrollbarWidth: 'none' }}
                >
                    {options.map(opt => (
                        <div key={opt}
                            onClick={() => { onChange(opt); scrollToValue(opt, true); }}
                            style={{ height: WHEEL_ITEM_H, scrollSnapAlign: 'center' }}
                            className={`flex items-center justify-center font-bold tabular-nums transition-all cursor-pointer ${opt === value ? 'text-white text-2xl' : 'text-white/25 text-base'}`}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
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
    const [paused, setPaused] = useState(false);

    const stepsRef = useRef<Step[]>([]);
    const stepIdxRef = useRef(0);
    const phaseEndRef = useRef(0);
    const pausedRemainingRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastTickSecondRef = useRef<number | null>(null);

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

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

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
            return;
        }
        const step = steps[idx];
        stepIdxRef.current = idx;
        phaseEndRef.current = startAt + step.duration * 1000;
        setPhase(step.phase);
        setRound(step.round);
        setRemainingMs(step.duration * 1000);
        lastTickSecondRef.current = null;
        playPhaseSound(step.phase);
    }, [playPhaseSound]);

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
    };

    const handlePause = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        pausedRemainingRef.current = phaseEndRef.current - Date.now();
        setPaused(true);
    };

    const handleResume = () => {
        phaseEndRef.current = Date.now() + Math.max(0, pausedRemainingRef.current);
        setPaused(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, 100);
    };

    const handleReset = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        setPhase('idle');
        setRound(0);
        setRemainingMs(0);
        setPaused(false);
        stepsRef.current = [];
        stepIdxRef.current = 0;
    };

    const isRunning = phase !== 'idle' && phase !== 'done';
    const totalRounds = rounds;
    const secondsLeft = Math.ceil(remainingMs / 1000);
    const color = PHASE_COLOR[phase];

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-20">
            <div className="fixed inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative max-w-md mx-auto px-4 pt-4 space-y-4">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all">
                        <ChevronLeft size={18} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <TimerIcon size={20} className="text-emerald-400" />
                        <h1 className="text-white font-bold text-2xl">Timer Intermitente</h1>
                    </div>
                </div>

                {/* Display */}
                <div className="rounded-[2rem] p-8 flex flex-col items-center justify-center text-center overflow-hidden relative"
                    style={{ background: `linear-gradient(165deg, ${color}18, rgba(17,17,17,0.95))`, border: `1px solid ${color}40`, boxShadow: `0 0 0 1px ${color}0A inset, 0 10px 30px -12px ${color}35` }}>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] mb-2" style={{ color }}>{PHASE_LABEL[phase]}</p>
                    <p className="font-black text-white leading-none tabular-nums" style={{ fontSize: 'clamp(72px, 22vw, 108px)' }}>
                        {isRunning || phase === 'done' ? secondsLeft : '--'}
                    </p>
                    {phase !== 'idle' && phase !== 'done' && phase !== 'prep' && (
                        <p className="text-white/50 text-base font-semibold mt-3">Ronda {round} de {totalRounds}</p>
                    )}
                    {phase === 'done' && (
                        <p className="text-white/50 text-base font-semibold mt-3">{totalRounds} rondas completadas</p>
                    )}
                </div>

                {/* Config */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wide">Configuración</p>
                    <div className="flex gap-2">
                        <WheelPicker label="Trabajo (seg)" value={work} onChange={setWork} min={5} max={600} step={5} disabled={isRunning} />
                        <WheelPicker label="Descanso (seg)" value={rest} onChange={setRest} min={0} max={600} step={5} disabled={isRunning} />
                    </div>
                    <div className="flex gap-2">
                        <WheelPicker label="Series" value={rounds} onChange={setRounds} min={1} max={50} step={1} disabled={isRunning} />
                        <WheelPicker label="Preparación (seg)" value={prep} onChange={setPrep} min={0} max={60} step={5} disabled={isRunning} />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                    {!isRunning && phase !== 'done' && (
                        <button onClick={handleStart}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-lg transition-all shadow-md shadow-emerald-500/20">
                            <Play size={20} fill="currentColor" /> Empezar
                        </button>
                    )}
                    {isRunning && !paused && (
                        <button onClick={handlePause}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-bold text-lg transition-all">
                            <Pause size={20} fill="currentColor" /> Pausar
                        </button>
                    )}
                    {isRunning && paused && (
                        <button onClick={handleResume}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-lg transition-all">
                            <Play size={20} fill="currentColor" /> Continuar
                        </button>
                    )}
                    {(isRunning || phase === 'done') && (
                        <button onClick={handleReset}
                            className="w-16 flex items-center justify-center rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 text-white/60 transition-all">
                            <RotateCcw size={20} />
                        </button>
                    )}
                </div>

                <p className="text-white/25 text-xs text-center px-4">
                    Mantené la app abierta y la pantalla encendida durante el ejercicio para que los avisos sonoros funcionen bien.
                </p>
            </div>
        </div>
    );
}
