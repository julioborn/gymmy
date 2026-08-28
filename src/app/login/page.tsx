"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step =
    | { type: 'identifier' }
    | { type: 'staff-password'; username: string }
    | { type: 'gym-select'; gyms: GymOption[]; dniRaw: string }
    | { type: 'alumno-register'; nombre: string; apellido: string; dni: string; gimnasioId: string; gimnasioNombre: string; gimnasioLogoUrl: string | null }
    | { type: 'alumno-login'; nombre: string; apellido: string; dni: string; gimnasioId: string; gimnasioNombre: string; gimnasioLogoUrl: string | null };

interface GymOption {
    gimnasioId: string;
    gimnasioNombre: string;
    gimnasioLogoUrl: string | null;
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
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>({ type: 'identifier' });
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    function reset() {
        setStep({ type: 'identifier' });
        setDni('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setShowPass(false);
        setShowConfirmPass(false);
    }

    async function handleDniSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        const clean = dni.replace(/\D/g, '');
        if (clean.length < 7) { setError('Ingresá tu DNI completo.'); return; }

        setLoading(true);
        try {
            // Check staff first (staff can have numeric DNI as username)
            const staffRes = await fetch(`/api/auth/staff/check?username=${clean}`);
            const staffData = await staffRes.json();
            if (staffData.found) {
                setStep({ type: 'staff-password', username: clean });
                return;
            }

            // Not staff — try as alumno
            const alumnoRes = await fetch(`/api/auth/alumno/check?dni=${clean}`);
            const alumnoData = await alumnoRes.json();
            if (!alumnoData.found) {
                setError('No encontramos ese DNI. Consultá con tu gimnasio.');
                return;
            }
            if (alumnoData.multiple) {
                setStep({ type: 'gym-select', gyms: alumnoData.gyms, dniRaw: dni });
                return;
            }
            if (alumnoData.hasPassword) {
                setStep({ type: 'alumno-login', nombre: alumnoData.nombre, apellido: alumnoData.apellido, dni: clean, gimnasioId: alumnoData.gimnasioId, gimnasioNombre: alumnoData.gimnasioNombre, gimnasioLogoUrl: alumnoData.gimnasioLogoUrl ?? null });
            } else {
                setStep({ type: 'alumno-register', nombre: alumnoData.nombre, apellido: alumnoData.apellido, dni: clean, gimnasioId: alumnoData.gimnasioId, gimnasioNombre: alumnoData.gimnasioNombre, gimnasioLogoUrl: alumnoData.gimnasioLogoUrl ?? null });
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
            if (res?.error) { setError('Contraseña incorrecta.'); return; }
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
        const clean = dni.replace(/\D/g, '');
        if (gym.hasPassword) {
            setStep({ type: 'alumno-login', nombre: gym.nombre, apellido: gym.apellido, dni: clean, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre, gimnasioLogoUrl: gym.gimnasioLogoUrl });
        } else {
            setStep({ type: 'alumno-register', nombre: gym.nombre, apellido: gym.apellido, dni: clean, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre, gimnasioLogoUrl: gym.gimnasioLogoUrl });
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

    async function doAlumnoLogin(dniVal: string, gimnasioId: string, pwd: string) {
        const res = await signIn('alumno-credentials', { redirect: false, dni: dniVal, password: pwd, gimnasioId });
        if (res?.error) { setError('Contraseña incorrecta.'); return; }
        router.push('/mi-cuenta');
    }

    const inputCls = "w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-4 text-lg font-semibold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-normal transition-all";
    const passInputCls = "w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl pl-4 pr-12 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-slate-300 transition-all";
    const primaryBtn = "w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-white py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20";

    return (
        <div className="min-h-[calc(100vh-75px)] -m-3 flex flex-col items-center justify-center px-4 py-10 bg-slate-50">

            <div className="w-full max-w-[360px]">

                {/* Back */}
                {step.type !== 'identifier' && (
                    <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors mb-4"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                        Volver
                    </button>
                )}

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 overflow-hidden border border-slate-100">

                    {/* Accent strip */}
                    <div className="h-1 w-full bg-emerald-500" />

                    {/* ── DNI ── */}
                    {step.type === 'identifier' && (
                        <div className="px-7 pt-8 pb-7">
                            <div className="text-center mb-7">
                                <h1 className="text-2xl font-bold text-slate-900">Ingresá tu DNI</h1>
                            </div>
                            <form onSubmit={handleDniSubmit} className="space-y-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={dni}
                                    onChange={e => setDni(formatDNI(e.target.value))}
                                    placeholder="00.000.000"
                                    required
                                    autoFocus
                                    className={inputCls}
                                />
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <Spinner /> : 'Continuar'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── Contraseña staff ── */}
                    {step.type === 'staff-password' && (
                        <div className="px-7 pt-8 pb-7">
                            <div className="text-center mb-7">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-0.5">Personal</p>
                                <h1 className="text-xl font-bold text-slate-900">{step.username}</h1>
                            </div>
                            <form onSubmit={handleStaffLogin} className="space-y-3">
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Contraseña"
                                        required
                                        autoFocus
                                        className={passInputCls}
                                    />
                                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        <EyeIcon open={showPass} />
                                    </button>
                                </div>
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <Spinner /> : 'Ingresar'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── Seleccionar gimnasio ── */}
                    {step.type === 'gym-select' && (
                        <div className="px-7 pt-8 pb-7">
                            <div className="text-center mb-6">
                                <h1 className="text-xl font-bold text-slate-900">¿Cuál es tu gimnasio?</h1>
                                <p className="text-slate-400 text-sm mt-1">Tu DNI está en más de uno</p>
                            </div>
                            <div className="space-y-2.5">
                                {step.gyms.map(gym => (
                                    <button
                                        key={gym.gimnasioId}
                                        onClick={() => handleGymSelect(gym)}
                                        className="w-full bg-slate-50 hover:bg-emerald-50 active:scale-[0.98] border border-slate-200 hover:border-emerald-200 rounded-2xl px-4 py-3.5 text-left transition-all flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm">{gym.gimnasioNombre}</p>
                                            <p className="text-slate-400 text-xs mt-0.5">{gym.nombre} {gym.apellido}</p>
                                        </div>
                                        <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Primer acceso alumno ── */}
                    {step.type === 'alumno-register' && (
                        <div className="px-7 pt-8 pb-7">
                            <div className="text-center mb-6">
                                {step.gimnasioLogoUrl ? (
                                    <img src={step.gimnasioLogoUrl} alt={step.gimnasioNombre} className="h-14 w-auto object-contain mx-auto mb-4" />
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                    </div>
                                )}
                                <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-0.5">{step.gimnasioNombre}</p>
                                <h1 className="text-xl font-bold text-slate-900">Hola, {step.nombre}</h1>
                                <p className="text-slate-400 text-sm mt-1">Primer acceso — creá tu contraseña</p>
                            </div>
                            <form onSubmit={handleAlumnoRegister} className="space-y-3">
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Nueva contraseña (mín. 6 caracteres)"
                                        required
                                        className={passInputCls}
                                    />
                                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        <EyeIcon open={showPass} />
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showConfirmPass ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repetí la contraseña"
                                        required
                                        className={passInputCls}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        <EyeIcon open={showConfirmPass} />
                                    </button>
                                </div>
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <Spinner /> : 'Crear cuenta e ingresar'}
                                </button>
                                <p className="text-center text-slate-400 text-xs pt-1">
                                    ¿Ya tenés contraseña?{' '}
                                    <button
                                        type="button"
                                        onClick={() => step.type === 'alumno-register' && setStep({ type: 'alumno-login', nombre: step.nombre, apellido: step.apellido, dni: step.dni, gimnasioId: step.gimnasioId, gimnasioNombre: step.gimnasioNombre, gimnasioLogoUrl: step.gimnasioLogoUrl })}
                                        className="text-emerald-600 font-semibold hover:text-emerald-500"
                                    >
                                        Ingresá acá
                                    </button>
                                </p>
                            </form>
                        </div>
                    )}

                    {/* ── Login alumno ── */}
                    {step.type === 'alumno-login' && (
                        <div className="px-7 pt-8 pb-7">
                            <div className="text-center mb-6">
                                {step.gimnasioLogoUrl ? (
                                    <img src={step.gimnasioLogoUrl} alt={step.gimnasioNombre} className="h-14 w-auto object-contain mx-auto mb-4" />
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                    </div>
                                )}
                                <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-0.5">{step.gimnasioNombre}</p>
                                <h1 className="text-xl font-bold text-slate-900">Hola, {step.nombre}</h1>
                            </div>
                            <form onSubmit={handleAlumnoLogin} className="space-y-3">
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Contraseña"
                                        required
                                        autoFocus
                                        className={passInputCls}
                                    />
                                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        <EyeIcon open={showPass} />
                                    </button>
                                </div>
                                {error && <ErrorBanner message={error} />}
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <Spinner /> : 'Ingresar'}
                                </button>
                                <p className="text-center text-slate-400 text-xs pt-1">
                                    ¿Olvidaste tu contraseña?{' '}
                                    <button
                                        type="button"
                                        onClick={() => step.type === 'alumno-login' && setStep({ type: 'alumno-register', nombre: step.nombre, apellido: step.apellido, dni: step.dni, gimnasioId: step.gimnasioId, gimnasioNombre: step.gimnasioNombre, gimnasioLogoUrl: step.gimnasioLogoUrl })}
                                        className="text-emerald-600 font-semibold hover:text-emerald-500"
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
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-red-500 text-sm font-medium">{message}</p>
        </div>
    );
}
