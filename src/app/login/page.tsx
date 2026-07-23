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

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-red-400 text-sm">{message}</p>
        </div>
    );
}

const inputCls = "w-full bg-white text-slate-900 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 placeholder:text-slate-400";
const primaryBtn = "w-full bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-slate-900 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2";

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>({ type: 'identifier' });
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function reset() {
        setStep({ type: 'identifier' });
        setIdentifier('');
        setPassword('');
        setConfirmPassword('');
        setError('');
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
        const clean = identifier.replace(/\D/g, '');
        const isAlumno = /^\d+$/.test(identifier.replace(/\./g, '')) && clean.length >= 7 && clean.length <= 8;

        if (isAlumno) {
            setLoading(true);
            try {
                const res = await fetch(`/api/auth/alumno/check?dni=${clean}`);
                const data = await res.json();

                if (!data.found) {
                    setError('No encontramos ese DNI en ningún gimnasio. Consultá con tu profesor.');
                    return;
                }

                if (data.multiple) {
                    setStep({ type: 'gym-select', gyms: data.gyms, dniRaw: identifier });
                    return;
                }

                if (data.hasPassword) {
                    setStep({ type: 'alumno-login', nombre: data.nombre, apellido: data.apellido, dni: clean, gimnasioId: data.gimnasioId, gimnasioNombre: data.gimnasioNombre });
                } else {
                    setStep({ type: 'alumno-register', nombre: data.nombre, apellido: data.apellido, dni: clean, gimnasioId: data.gimnasioId, gimnasioNombre: data.gimnasioNombre });
                }
            } catch {
                setError('Error de conexión. Intentá de nuevo.');
            } finally {
                setLoading(false);
            }
        } else {
            if (!identifier.trim()) {
                setError('Ingresá tu usuario o DNI.');
                return;
            }
            setStep({ type: 'staff-password', username: identifier.trim() });
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

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
            <div className="w-full max-w-xs">

                {step.type !== 'identifier' && (
                    <button onClick={reset} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mb-8">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                        Volver
                    </button>
                )}

                {/* ── Identificador ── */}
                {step.type === 'identifier' && (
                    <>
                        <div className="mb-8">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Bienvenido</p>
                            <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
                        </div>
                        <form onSubmit={handleIdentifierSubmit} className="space-y-3">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                    Usuario o DNI
                                </label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={e => handleIdentifierChange(e.target.value)}
                                    placeholder="Usuario o número de DNI"
                                    required
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    className={inputCls}
                                />
                            </div>
                            {error && <ErrorBanner message={error} />}
                            <button type="submit" disabled={loading} className={primaryBtn}>
                                {loading ? <><Spinner /> Buscando...</> : 'Continuar'}
                            </button>
                        </form>
                    </>
                )}

                {/* ── Contraseña staff ── */}
                {step.type === 'staff-password' && (
                    <>
                        <div className="mb-7">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Personal</p>
                            <h1 className="text-2xl font-bold text-white">{step.username}</h1>
                            <p className="text-slate-400 text-sm mt-1">Ingresá tu contraseña</p>
                        </div>
                        <form onSubmit={handleStaffLogin} className="space-y-3">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contraseña</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus className={inputCls} />
                            </div>
                            {error && <ErrorBanner message={error} />}
                            <button type="submit" disabled={loading} className={primaryBtn}>
                                {loading ? <><Spinner /> Ingresando...</> : 'Ingresar'}
                            </button>
                        </form>
                    </>
                )}

                {/* ── Seleccionar gimnasio (alumno) ── */}
                {step.type === 'gym-select' && (
                    <>
                        <div className="mb-7">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Tu DNI está en más de un gimnasio</p>
                            <h1 className="text-2xl font-bold text-white">Seleccioná tu gimnasio</h1>
                        </div>
                        <div className="space-y-2.5">
                            {step.gyms.map(gym => (
                                <button key={gym.gimnasioId} onClick={() => handleGymSelect(gym)} className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60 rounded-2xl px-4 py-4 text-left transition-all flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white text-sm">{gym.gimnasioNombre}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{gym.nombre} {gym.apellido}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Primer acceso alumno ── */}
                {step.type === 'alumno-register' && (
                    <>
                        <div className="mb-7">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Primer acceso · {step.gimnasioNombre}</p>
                            <h1 className="text-2xl font-bold text-white">Hola, {step.nombre}</h1>
                            <p className="text-slate-400 text-sm mt-1">Creá tu contraseña para ingresar</p>
                        </div>
                        <form onSubmit={handleAlumnoRegister} className="space-y-3">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Nueva contraseña</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Repetir contraseña</label>
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetí la contraseña" required className={inputCls} />
                                </div>
                            </div>
                            {error && <ErrorBanner message={error} />}
                            <button type="submit" disabled={loading} className={primaryBtn}>
                                {loading ? <><Spinner /> Creando cuenta...</> : 'Crear cuenta e ingresar'}
                            </button>
                            <p className="text-center text-slate-600 text-xs pt-1">
                                ¿Ya tenés contraseña?{' '}
                                <button type="button" onClick={() => step.type === 'alumno-register' && setStep({ type: 'alumno-login', nombre: step.nombre, apellido: step.apellido, dni: step.dni, gimnasioId: step.gimnasioId, gimnasioNombre: step.gimnasioNombre })} className="text-slate-400 underline underline-offset-2 hover:text-slate-200">
                                    Ingresá acá
                                </button>
                            </p>
                        </form>
                    </>
                )}

                {/* ── Login alumno ── */}
                {step.type === 'alumno-login' && (
                    <>
                        <div className="mb-7">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">{step.gimnasioNombre}</p>
                            <h1 className="text-2xl font-bold text-white">Hola, {step.nombre}</h1>
                            <p className="text-slate-400 text-sm mt-1">Ingresá tu contraseña</p>
                        </div>
                        <form onSubmit={handleAlumnoLogin} className="space-y-3">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contraseña</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus className={inputCls} />
                            </div>
                            {error && <ErrorBanner message={error} />}
                            <button type="submit" disabled={loading} className={primaryBtn}>
                                {loading ? <><Spinner /> Ingresando...</> : 'Ingresar'}
                            </button>
                        </form>
                    </>
                )}

            </div>
        </div>
    );
}
