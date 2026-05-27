"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step =
    | { type: 'dni' }
    | { type: 'gym-select'; gyms: GymOption[] }
    | { type: 'register'; nombre: string; apellido: string; dni: string; gimnasioId: string; gimnasioNombre: string }
    | { type: 'login'; nombre: string; apellido: string; dni: string; gimnasioId: string; gimnasioNombre: string };

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

const inputCls = "w-full bg-white text-slate-900 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-slate-400";
const primaryBtn = "w-full bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-slate-900 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2";

export default function AlumnoLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>({ type: 'dni' });
    const [dniRaw, setDniRaw] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    async function handleDNISubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        const cleanDNI = dniRaw.replace(/\D/g, '');

        if (cleanDNI.length < 7 || cleanDNI.length > 8) {
            setError('El DNI debe tener 7 u 8 dígitos.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/auth/alumno/check?dni=${cleanDNI}`);
            const data = await res.json();

            if (!data.found) {
                setError('No encontramos ese DNI en ningún gimnasio. Consultá con tu profesor.');
                return;
            }

            if (data.multiple) {
                setStep({ type: 'gym-select', gyms: data.gyms });
                return;
            }

            if (data.hasPassword) {
                setStep({ type: 'login', nombre: data.nombre, apellido: data.apellido, dni: cleanDNI, gimnasioId: data.gimnasioId, gimnasioNombre: data.gimnasioNombre });
            } else {
                setStep({ type: 'register', nombre: data.nombre, apellido: data.apellido, dni: cleanDNI, gimnasioId: data.gimnasioId, gimnasioNombre: data.gimnasioNombre });
            }
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    function handleGymSelect(gym: GymOption) {
        const cleanDNI = dniRaw.replace(/\D/g, '');
        if (gym.hasPassword) {
            setStep({ type: 'login', nombre: gym.nombre, apellido: gym.apellido, dni: cleanDNI, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre });
        } else {
            setStep({ type: 'register', nombre: gym.nombre, apellido: gym.apellido, dni: cleanDNI, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre });
        }
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        if (step.type !== 'register') return;
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/alumno/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: step.dni, gimnasioId: step.gimnasioId, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Error al crear la cuenta.');
                return;
            }

            await doLogin(step.dni, step.gimnasioId, password);
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        if (step.type !== 'login') return;
        setError('');
        setLoading(true);
        try {
            await doLogin(step.dni, step.gimnasioId, password);
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }

    async function doLogin(dni: string, gimnasioId: string, pwd: string) {
        const res = await signIn('alumno-credentials', {
            redirect: false,
            dni,
            password: pwd,
            gimnasioId,
        });

        if (res?.error) {
            setError('Contraseña incorrecta.');
            return;
        }

        router.push('/mi-cuenta');
    }

    function resetToDNI() {
        setStep({ type: 'dni' });
        setError('');
        setPassword('');
        setConfirmPassword('');
    }

    const isAtDNI = step.type === 'dni';

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
            <div className="w-full max-w-xs">

                {/* Botón volver */}
                <div className="mb-8">
                    {isAtDNI ? (
                        <Link href="/login" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                            Volver
                        </Link>
                    ) : (
                        <button onClick={resetToDNI} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                            Cambiar DNI
                        </button>
                    )}
                </div>

                {/* ── PASO 1: DNI ── */}
                {step.type === 'dni' && (
                    <>
                        <div className="mb-7">
                            <h1 className="text-2xl font-bold text-white">Alumno</h1>
                            <p className="text-slate-500 text-sm mt-1">Ingresá tu DNI para continuar</p>
                        </div>

                        <form onSubmit={handleDNISubmit} className="space-y-2.5">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={dniRaw}
                                onChange={e => setDniRaw(formatDNI(e.target.value))}
                                className={`${inputCls} text-center text-lg font-mono tracking-widest`}
                                maxLength={10}
                                placeholder="DNI"
                            />

                            {error && <ErrorBanner message={error} />}

                            <button type="submit" disabled={loading} className={primaryBtn}>
                                {loading ? <><Spinner /> Buscando...</> : 'Continuar'}
                            </button>
                        </form>
                    </>
                )}

                {/* ── PASO 2: seleccionar gimnasio ── */}
                {step.type === 'gym-select' && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-white">Seleccioná tu gimnasio</h1>
                            <p className="text-slate-500 text-sm mt-1">Tu DNI está en más de un gimnasio</p>
                        </div>

                        <div className="space-y-2">
                            {step.gyms.map(gym => (
                                <button
                                    key={gym.gimnasioId}
                                    onClick={() => handleGymSelect(gym)}
                                    className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 rounded-2xl px-5 py-4 text-left font-semibold text-sm transition-all flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-sm">{gym.gimnasioNombre}</p>
                                        <p className="text-slate-400 text-xs mt-0.5 font-normal">{gym.nombre} {gym.apellido}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ── PASO 3: primer acceso ── */}
                {step.type === 'register' && (
                    <>
                        <div className="mb-6">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Primer acceso</p>
                            <h1 className="text-2xl font-bold text-white">Hola, {step.nombre}</h1>
                            <p className="text-slate-500 text-sm mt-1">{step.gimnasioNombre} · Creá tu contraseña</p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-2.5">
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Nueva contraseña"
                                required
                                className={inputCls}
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Repetí la contraseña"
                                required
                                className={inputCls}
                            />

                            {error && <ErrorBanner message={error} />}

                            <button type="submit" disabled={loading} className={primaryBtn}>
                                {loading ? <><Spinner /> Creando cuenta...</> : 'Crear cuenta e ingresar'}
                            </button>

                            <p className="text-center text-slate-600 text-xs pt-1">
                                ¿Ya tenés contraseña?{' '}
                                <button
                                    type="button"
                                    onClick={() => step.type === 'register' && setStep({ type: 'login', nombre: step.nombre, apellido: step.apellido, dni: step.dni, gimnasioId: step.gimnasioId, gimnasioNombre: step.gimnasioNombre })}
                                    className="text-white underline underline-offset-2 hover:text-slate-300"
                                >
                                    Ingresá acá
                                </button>
                            </p>
                        </form>
                    </>
                )}

                {/* ── PASO 4: login normal ── */}
                {step.type === 'login' && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-white">Hola, {step.nombre}</h1>
                            <p className="text-slate-500 text-sm mt-1">{step.gimnasioNombre}</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-2.5">
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                required
                                autoFocus
                                className={inputCls}
                            />

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
