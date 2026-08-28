"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step =
    | { type: 'identifier' }
    | { type: 'staff-password'; username: string }
    | { type: 'gym-select'; gyms: GymOption[]; dniRaw: string }
    | { type: 'alumno-register'; nombre: string; apellido: string; dni: string; gimnasioId: string; gimnasioNombre: string }
    | { type: 'alumno-login'; nombre: string; apellido: string; dni: string; gimnasioId: string; gimnasioNombre: string };

interface GymOption {
    gimnasioId: string;
    gimnasioNombre: string;
    nombre: string;
    apellido: string;
    hasPassword: boolean;
}

function formatDNI(input: string): string {
    const digits = input.replace(/\D/g, '').slice(0, 8);
    const len = digits.length;
    if (len <= 3) return digits;
    if (len === 4) return `${digits.slice(0, 1)}.${digits.slice(1)}`;
    if (len === 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (len === 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (len === 7) return `${digits.slice(0, 1)}.${digits.slice(1, 4)}.${digits.slice(4)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
}

function Spinner() {
    return (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

function InputIcon({ children }: { children: React.ReactNode }) {
    return (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
            {children}
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>({ type: 'identifier' });
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    function reset() {
        setStep({ type: 'identifier' });
        setIdentifier('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setShowPass(false);
        setShowConfirmPass(false);
    }

    function handleIdentifierChange(val: string) {
        const stripped = val.replace(/\./g, '');
        if (/^\d*$/.test(stripped)) {
            setIdentifier(formatDNI(val));
        } else {
            setIdentifier(val);
        }
    }

    async function handleIdentifierSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!identifier.trim()) { setError('Ingresá tu usuario o DNI.'); return; }

        const clean = identifier.replace(/\D/g, '');
        const looksLikeDNI = /^\d+$/.test(identifier.replace(/\./g, '')) && clean.length >= 7 && clean.length <= 8;

        setLoading(true);
        try {
            // Always check staff first — a staff user may have a numeric username (e.g. DNI)
            const staffRes = await fetch(`/api/auth/staff/check?username=${encodeURIComponent(identifier.trim())}`);
            const staffData = await staffRes.json();
            if (staffData.found) {
                setStep({ type: 'staff-password', username: identifier.trim() });
                return;
            }

            // Not a staff user — try alumno lookup if it looks like a DNI
            if (looksLikeDNI) {
                const alumnoRes = await fetch(`/api/auth/alumno/check?dni=${clean}`);
                const alumnoData = await alumnoRes.json();
                if (!alumnoData.found) {
                    setError('No encontramos ese DNI en ningún gimnasio. Consultá con tu profesor.');
                    return;
                }
                if (alumnoData.multiple) {
                    setStep({ type: 'gym-select', gyms: alumnoData.gyms, dniRaw: identifier });
                    return;
                }
                if (alumnoData.hasPassword) {
                    setStep({ type: 'alumno-login', nombre: alumnoData.nombre, apellido: alumnoData.apellido, dni: clean, gimnasioId: alumnoData.gimnasioId, gimnasioNombre: alumnoData.gimnasioNombre });
                } else {
                    setStep({ type: 'alumno-register', nombre: alumnoData.nombre, apellido: alumnoData.apellido, dni: clean, gimnasioId: alumnoData.gimnasioId, gimnasioNombre: alumnoData.gimnasioNombre });
                }
            } else {
                setError('Usuario no encontrado.');
            }
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    async function handleStaffLogin(e: React.FormEvent) {
        e.preventDefault();
        if (step.type !== 'staff-password') return;
        setError('');
        setLoading(true);
        try {
            const res = await signIn('staff-credentials', { redirect: false, username: step.username, password });
            if (res?.error) { setError('Usuario o contraseña incorrectos.'); return; }
            const sessionRes = await fetch('/api/auth/session');
            const session = await sessionRes.json();
            if (session?.user?.role === 'registro') {
                router.push('/alumnos/dni');
            } else if (session?.user?.role === 'superadmin') {
                router.push('/superadmin');
            } else {
                router.push('/');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }

    function handleGymSelect(gym: GymOption) {
        const clean = identifier.replace(/\D/g, '');
        if (gym.hasPassword) {
            setStep({ type: 'alumno-login', nombre: gym.nombre, apellido: gym.apellido, dni: clean, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre });
        } else {
            setStep({ type: 'alumno-register', nombre: gym.nombre, apellido: gym.apellido, dni: clean, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre });
        }
    }

    async function handleAlumnoRegister(e: React.FormEvent) {
        e.preventDefault();
        if (step.type !== 'alumno-register') return;
        setError('');
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
        if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/alumno/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: step.dni, gimnasioId: step.gimnasioId, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error al crear la cuenta.'); return; }
            await doAlumnoLogin(step.dni, step.gimnasioId, password);
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }

    async function handleAlumnoLogin(e: React.FormEvent) {
        e.preventDefault();
        if (step.type !== 'alumno-login') return;
        setError('');
        setLoading(true);
        try {
            await doAlumnoLogin(step.dni, step.gimnasioId, password);
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }

    async function doAlumnoLogin(dni: string, gimnasioId: string, pwd: string) {
        const res = await signIn('alumno-credentials', { redirect: false, dni, password: pwd, gimnasioId });
        if (res?.error) { setError('Contraseña incorrecta.'); return; }
        router.push('/mi-cuenta');
    }

    const inputCls = "w-full rounded-2xl pl-11 pr-4 py-4 text-base font-medium focus:outline-none placeholder:text-slate-600 transition-all text-white";
    const inputPassCls = "w-full rounded-2xl pl-11 pr-12 py-4 text-base font-medium focus:outline-none placeholder:text-slate-600 transition-all text-white";
    const inputStyle = {
        background: '#1c1c1c',
        border: '1px solid rgba(255,255,255,0.08)',
    };
    const inputFocusClass = "focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10";

    const primaryBtn = "w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-white py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20";

    const UserIcon = (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    );
    const LockIcon = (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    );
    const EyeIcon = ({ open }: { open: boolean }) => open ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
    ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
    );

    return (
        <div
            className="min-h-[calc(100vh-75px)] -m-3 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
            style={{ background: '#0a0a0a' }}
        >
            {/* Background glow — emerald, bottom-center */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 90% 55% at 50% 115%, rgba(16,185,129,0.09) 0%, transparent 70%)' }}
            />

            {/* Dot grid texture */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />

            <div className="w-full max-w-[360px] relative z-10">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="https://res.cloudinary.com/dwz4lcvya/image/upload/v1785379248/gymmynobg_e7mszc.png"
                        alt="Gymmy"
                        style={{ height: 36, width: 'auto', objectFit: 'contain' }}
                    />
                </div>

                {/* Back button */}
                {step.type !== 'identifier' && (
                    <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mb-4"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                        Volver
                    </button>
                )}

                {/* Card */}
                <div
                    className="overflow-hidden"
                    style={{
                        background: '#141414',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 24,
                    }}
                >

                    {/* ── Identificador ── */}
                    {step.type === 'identifier' && (
                        <div className="p-7">
                            <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-1">Bienvenido</p>
                            <h1 className="text-2xl font-bold text-white mb-6">Iniciá sesión</h1>
                            <form onSubmit={handleIdentifierSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Usuario o DNI</label>
                                    <div className="relative">
                                        <InputIcon>{UserIcon}</InputIcon>
                                        <input
                                            type="text"
                                            value={identifier}
                                            onChange={e => handleIdentifierChange(e.target.value)}
                                            placeholder="Usuario o número de DNI"
                                            required
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            className={`${inputCls} ${inputFocusClass}`}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <><Spinner /> Buscando...</> : 'Continuar'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── Contraseña staff ── */}
                    {step.type === 'staff-password' && (
                        <div className="p-7">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Personal</p>
                                    <h1 className="text-xl font-bold text-white leading-tight">{step.username}</h1>
                                </div>
                            </div>
                            <form onSubmit={handleStaffLogin} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contraseña</label>
                                    <div className="relative">
                                        <InputIcon>{LockIcon}</InputIcon>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            autoFocus
                                            className={`${inputPassCls} ${inputFocusClass}`}
                                            style={inputStyle}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(p => !p)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                                        >
                                            <EyeIcon open={showPass} />
                                        </button>
                                    </div>
                                </div>
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <><Spinner /> Ingresando...</> : 'Ingresar'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── Seleccionar gimnasio ── */}
                    {step.type === 'gym-select' && (
                        <div className="p-7">
                            <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-1">Múltiples gimnasios</p>
                            <h1 className="text-2xl font-bold text-white mb-6">¿Cuál es tu gimnasio?</h1>
                            <div className="space-y-2.5">
                                {step.gyms.map(gym => (
                                    <button
                                        key={gym.gimnasioId}
                                        onClick={() => handleGymSelect(gym)}
                                        className="w-full active:scale-[0.98] rounded-2xl px-4 py-3.5 text-left transition-all flex items-center gap-3 hover:border-white/20"
                                        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm">{gym.gimnasioNombre}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">{gym.nombre} {gym.apellido}</p>
                                        </div>
                                        <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Primer acceso alumno ── */}
                    {step.type === 'alumno-register' && (
                        <div className="p-7">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">{step.gimnasioNombre}</p>
                                    <h1 className="text-xl font-bold text-white leading-tight">Hola, {step.nombre}</h1>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm mb-5">Es tu primer acceso. Creá una contraseña para tu cuenta.</p>
                            <form onSubmit={handleAlumnoRegister} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
                                    <div className="relative">
                                        <InputIcon>{LockIcon}</InputIcon>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            className={`${inputPassCls} ${inputFocusClass}`}
                                            style={inputStyle}
                                        />
                                        <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                                            <EyeIcon open={showPass} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Repetir contraseña</label>
                                    <div className="relative">
                                        <InputIcon>{LockIcon}</InputIcon>
                                        <input
                                            type={showConfirmPass ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Repetí la contraseña"
                                            required
                                            className={`${inputPassCls} ${inputFocusClass}`}
                                            style={inputStyle}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                                            <EyeIcon open={showConfirmPass} />
                                        </button>
                                    </div>
                                </div>
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <><Spinner /> Creando cuenta...</> : 'Crear cuenta e ingresar'}
                                </button>
                                <p className="text-center text-slate-600 text-xs pt-1">
                                    ¿Ya tenés contraseña?{' '}
                                    <button
                                        type="button"
                                        onClick={() => step.type === 'alumno-register' && setStep({ type: 'alumno-login', nombre: step.nombre, apellido: step.apellido, dni: step.dni, gimnasioId: step.gimnasioId, gimnasioNombre: step.gimnasioNombre })}
                                        className="text-emerald-500 font-semibold hover:text-emerald-400"
                                    >
                                        Ingresá acá
                                    </button>
                                </p>
                            </form>
                        </div>
                    )}

                    {/* ── Login alumno ── */}
                    {step.type === 'alumno-login' && (
                        <div className="p-7">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">{step.gimnasioNombre}</p>
                                    <h1 className="text-xl font-bold text-white leading-tight">Hola, {step.nombre}</h1>
                                </div>
                            </div>
                            <form onSubmit={handleAlumnoLogin} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contraseña</label>
                                    <div className="relative">
                                        <InputIcon>{LockIcon}</InputIcon>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            autoFocus
                                            className={`${inputPassCls} ${inputFocusClass}`}
                                            style={inputStyle}
                                        />
                                        <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                                            <EyeIcon open={showPass} />
                                        </button>
                                    </div>
                                </div>
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <><Spinner /> Ingresando...</> : 'Ingresar'}
                                </button>
                                <p className="text-center text-slate-600 text-xs pt-1">
                                    ¿Olvidaste tu contraseña?{' '}
                                    <button
                                        type="button"
                                        onClick={() => step.type === 'alumno-login' && setStep({ type: 'alumno-register', nombre: step.nombre, apellido: step.apellido, dni: step.dni, gimnasioId: step.gimnasioId, gimnasioNombre: step.gimnasioNombre })}
                                        className="text-emerald-500 font-semibold hover:text-emerald-400"
                                    >
                                        Crear nueva
                                    </button>
                                </p>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-red-400 text-sm font-medium">{message}</p>
        </div>
    );
}
