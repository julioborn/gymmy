'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react';

type PhaseKind = 'prep' | 'work' | 'rest';
type Phase = PhaseKind | 'idle' | 'done';
type Step = { phase: PhaseKind; duration: number; round: number };

const STORAGE_KEY = 'gymmy_timer_config_v1';
const NOTIF_BASE_ID = 93000;
const NOTIF_MAX = 64;

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

async function isNativeApp(): Promise<boolean> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

async function cancelTimerNotifications() {
    try {
        if (!(await isNativeApp())) return;
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const ids = Array.from({ length: NOTIF_MAX }, (_, i) => ({ id: NOTIF_BASE_ID + i }));
        await LocalNotifications.cancel({ notifications: ids });
    } catch {}
}

async function scheduleTimerNotifications(steps: Step[], startAt: number) {
    try {
        if (!(await isNativeApp())) return;
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const { display } = await LocalNotifications.checkPermissions();
        if (display !== 'granted') {
            const r = await LocalNotifications.requestPermissions();
            if (r.display !== 'granted') return;
        }
        await cancelTimerNotifications();

        let t = startAt;
        const notifications: any[] = [];
        for (let i = 0; i < steps.length && i < NOTIF_MAX - 1; i++) {
            t += steps[i].duration * 1000;
            const next = steps[i + 1];
            const body = !next ? '¡Listo! Terminaste la serie.' : next.phase === 'work' ? `¡A trabajar! Ronda ${next.round}` : next.phase === 'rest' ? 'Descanso' : 'Preparate';
            notifications.push({
                id: NOTIF_BASE_ID + i,
                title: 'SportTime · Timer',
                body,
                schedule: { at: new Date(t) },
                sound: undefined,
            });
        }
        if (notifications.length) await LocalNotifications.schedule({ notifications });
    } catch {}
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

    const beep = useCallback((freq: number, duration: number, vol = 0.3) => {
        try {
            const ctx = ensureAudio();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
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
        if (p === 'work') beep(880, 0.18, 0.35);
        else if (p === 'rest') beep(440, 0.18, 0.3);
        else if (p === 'prep') beep(660, 0.12, 0.25);
        else if (p === 'done') { beep(660, 0.12); setTimeout(() => beep(880, 0.12), 150); setTimeout(() => beep(1100, 0.22), 300); }
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
            beep(1000, 0.08, 0.2);
        }
    }, [beep, goToStep]);

    const handleStart = async () => {
        ensureAudio();
        const steps = buildTimeline(prep, work, rest, rounds);
        if (!steps.length) return;
        stepsRef.current = steps;
        setPaused(false);
        const now = Date.now();
        goToStep(0, now);
        scheduleTimerNotifications(steps, now);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, 100);
    };

    const handlePause = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        pausedRemainingRef.current = phaseEndRef.current - Date.now();
        setPaused(true);
        cancelTimerNotifications();
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
        cancelTimerNotifications();
    };

    const isRunning = phase !== 'idle' && phase !== 'done';
    const totalRounds = rounds;
    const secondsLeft = Math.ceil(remainingMs / 1000);
    const color = PHASE_COLOR[phase];

    const NumField = ({ label, value, onChange, min = 1, max = 999 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
        <div className="flex-1">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1 block">{label}</label>
            <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={value}
                disabled={isRunning}
                onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
                className="w-full border border-white/10 bg-white/[0.04] rounded-xl px-3 py-2.5 text-center text-white font-bold text-lg disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400/50"
            />
        </div>
    );

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
                        <TimerIcon size={18} className="text-emerald-400" />
                        <h1 className="text-white font-bold text-xl">Timer Intermitente</h1>
                    </div>
                </div>

                {/* Display */}
                <div className="rounded-[2rem] p-8 flex flex-col items-center justify-center text-center overflow-hidden relative"
                    style={{ background: `linear-gradient(165deg, ${color}18, rgba(17,17,17,0.95))`, border: `1px solid ${color}40`, boxShadow: `0 0 0 1px ${color}0A inset, 0 10px 30px -12px ${color}35` }}>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color }}>{PHASE_LABEL[phase]}</p>
                    <p className="font-black text-white leading-none tabular-nums" style={{ fontSize: 'clamp(64px, 20vw, 96px)' }}>
                        {isRunning || phase === 'done' ? secondsLeft : '--'}
                    </p>
                    {phase !== 'idle' && phase !== 'done' && phase !== 'prep' && (
                        <p className="text-white/50 text-sm font-semibold mt-3">Ronda {round} de {totalRounds}</p>
                    )}
                    {phase === 'done' && (
                        <p className="text-white/50 text-sm font-semibold mt-3">{totalRounds} rondas completadas</p>
                    )}
                </div>

                {/* Config */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide">Configuración</p>
                    <div className="flex gap-2">
                        <NumField label="Trabajo (seg)" value={work} onChange={setWork} min={5} max={600} />
                        <NumField label="Descanso (seg)" value={rest} onChange={setRest} min={0} max={600} />
                    </div>
                    <div className="flex gap-2">
                        <NumField label="Series" value={rounds} onChange={setRounds} min={1} max={50} />
                        <NumField label="Preparación (seg)" value={prep} onChange={setPrep} min={0} max={60} />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                    {!isRunning && phase !== 'done' && (
                        <button onClick={handleStart}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-base transition-all shadow-md shadow-emerald-500/20">
                            <Play size={18} fill="currentColor" /> Empezar
                        </button>
                    )}
                    {isRunning && !paused && (
                        <button onClick={handlePause}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-bold text-base transition-all">
                            <Pause size={18} fill="currentColor" /> Pausar
                        </button>
                    )}
                    {isRunning && paused && (
                        <button onClick={handleResume}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-base transition-all">
                            <Play size={18} fill="currentColor" /> Continuar
                        </button>
                    )}
                    {(isRunning || phase === 'done') && (
                        <button onClick={handleReset}
                            className="w-16 flex items-center justify-center rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 text-white/60 transition-all">
                            <RotateCcw size={18} />
                        </button>
                    )}
                </div>

                <p className="text-white/25 text-[11px] text-center px-4">
                    Mantené la app abierta y la pantalla encendida durante el ejercicio para que los avisos sonoros funcionen bien.
                </p>
            </div>
        </div>
    );
}
