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
    if (len === 4) return `${digits.slice(0,1)}.${digits.slice(1)}`;
    if (len === 5) return `${digits.slice(0,2)}.${digits.slice(2)}`;
    if (len === 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
    if (len === 7) return `${digits.slice(0,1)}.${digits.slice(1,4)}.${digits.slice(4)}`;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
}

export default function AlumnoLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>({ type: 'dni' });
    const [dniRaw, setDniRaw] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // ── Step 1: verificar DNI ──────────────────────────────────────────
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

    // ── Step 2a: seleccionar gimnasio (caso múltiple) ──────────────────
    function handleGymSelect(gym: GymOption) {
        const cleanDNI = dniRaw.replace(/\D/g, '');
        if (gym.hasPassword) {
            setStep({ type: 'login', nombre: gym.nombre, apellido: gym.apellido, dni: cleanDNI, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre });
        } else {
            setStep({ type: 'register', nombre: gym.nombre, apellido: gym.apellido, dni: cleanDNI, gimnasioId: gym.gimnasioId, gimnasioNombre: gym.gimnasioNombre });
        }
    }

    // ── Step 2b: primer acceso — crear contraseña ──────────────────────
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

            // Auto-login
            await doLogin(step.dni, step.gimnasioId, password);
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }

    // ── Step 2c: login normal ──────────────────────────────────────────
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

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-sm">

                {/* Header */}
                <div className="mb-6">
                    {step.type === 'dni' ? (
                        <Link href="/login" className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 mb-4">
                            ← Volver
                        </Link>
                    ) : (
                        <button onClick={resetToDNI} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 mb-4">
                            ← Cambiar DNI
                        </button>
                    )}
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">

                    {/* STEP 1: DNI */}
                    {step.type === 'dni' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="text-4xl mb-2">👤</div>
                                <h1 className="text-xl font-bold text-white">Acceso para alumnos</h1>
                                <p className="text-slate-400 text-sm mt-1">Ingresá tu DNI para continuar</p>
                            </div>

                            <form onSubmit={handleDNISubmit} className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-1">Número de DNI</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={dniRaw}
                                        onChange={e => setDniRaw(formatDNI(e.target.value))}
                                        placeholder=""
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-3 text-lg font-mono text-center tracking-widest focus:outline-none focus:border-blue-500"
                                        maxLength={10}
                                    />
                                </div>

                                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                                >
                                    {loading ? 'Buscando...' : 'Continuar'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* STEP: seleccionar gimnasio */}
                    {step.type === 'gym-select' && (
                        <>
                            <h1 className="text-lg font-bold text-white mb-1">¿A cuál gimnasio pertenecés?</h1>
                            <p className="text-slate-400 text-sm mb-5">Tu DNI está registrado en más de un gimnasio.</p>

                            <div className="space-y-2">
                                {step.gyms.map(gym => (
                                    <button
                                        key={gym.gimnasioId}
                                        onClick={() => handleGymSelect(gym)}
                                        className="w-full bg-slate-900 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 text-white rounded-lg p-4 text-left transition-all"
                                    >
                                        <div className="font-semibold">{gym.gimnasioNombre}</div>
                                        <div className="text-slate-400 text-sm">{gym.nombre} {gym.apellido}</div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* STEP: primer acceso */}
                    {step.type === 'register' && (
                        <>
                            <div className="text-center mb-5">
                                <div className="text-3xl mb-2">👋</div>
                                <h1 className="text-lg font-bold text-white">
                                    ¡Hola, {step.nombre}!
                                </h1>
                                <p className="text-slate-400 text-sm mt-1">{step.gimnasioNombre}</p>
                                <div className="mt-3 bg-blue-900/30 border border-blue-800 rounded-lg px-3 py-2">
                                    <p className="text-blue-300 text-sm">Primer acceso — creá tu contraseña</p>
                                </div>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-3">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-1">Nueva contraseña</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-1">Confirmar contraseña</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repetí la contraseña"
                                        required
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {error && <p className="text-red-400 text-sm">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors mt-1"
                                >
                                    {loading ? 'Creando cuenta...' : 'Crear cuenta e ingresar'}
                                </button>

                                <p className="text-center text-slate-500 text-xs pt-1">
                                    ¿Ya creaste tu contraseña?{' '}
                                    <button
                                        type="button"
                                        onClick={() => step.type === 'register' && setStep({ type: 'login', nombre: step.nombre, apellido: step.apellido, dni: step.dni, gimnasioId: step.gimnasioId, gimnasioNombre: step.gimnasioNombre })}
                                        className="text-blue-400 hover:text-blue-300 underline"
                                    >
                                        Ingresá aquí
                                    </button>
                                </p>
                            </form>
                        </>
                    )}

                    {/* STEP: login normal */}
                    {step.type === 'login' && (
                        <>
                            <div className="text-center mb-5">
                                <div className="text-3xl mb-2">👋</div>
                                <h1 className="text-lg font-bold text-white">
                                    ¡Hola, {step.nombre}!
                                </h1>
                                <p className="text-slate-400 text-sm mt-1">{step.gimnasioNombre}</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Tu contraseña"
                                        required
                                        autoFocus
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {error && <p className="text-red-400 text-sm">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                                >
                                    {loading ? 'Ingresando...' : 'Ingresar'}
                                </button>
                            </form>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
