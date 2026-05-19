"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = 'select' | 'staff';

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>('select');
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const res = await signIn("staff-credentials", {
            redirect: false,
            username,
            password,
        });

        if (res?.error) {
            setError("Usuario o contraseña incorrectos.");
            return;
        }

        try {
            const sessionResponse = await fetch("/api/auth/session");
            const session = await sessionResponse.json();

            if (session?.user?.role === "registro") {
                router.push("/alumnos/dni");
            } else if (session?.user?.role === "superadmin") {
                router.push("/superadmin");
            } else {
                router.push("/");
            }
        } catch {
            router.push("/");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">

            {mode === 'select' && (
                <div className="w-full max-w-sm space-y-4">
                    <h1 className="text-2xl font-bold text-white text-center mb-8">
                        ¿Cómo querés ingresar?
                    </h1>

                    <button
                        onClick={() => setMode('staff')}
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-emerald-500 text-white rounded-xl p-5 text-left transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-lg bg-emerald-600/20 flex items-center justify-center text-2xl flex-shrink-0">
                                🏋️
                            </div>
                            <div>
                                <div className="font-semibold text-base">Personal del gimnasio</div>
                                <div className="text-slate-400 text-sm mt-0.5">Profesores, administradores y recepción</div>
                            </div>
                        </div>
                    </button>

                    <Link
                        href="/login/alumno"
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 text-white rounded-xl p-5 text-left transition-all flex items-center gap-4 block"
                    >
                        <div className="w-11 h-11 rounded-lg bg-blue-600/20 flex items-center justify-center text-2xl flex-shrink-0">
                            👤
                        </div>
                        <div>
                            <div className="font-semibold text-base">Soy alumno</div>
                            <div className="text-slate-400 text-sm mt-0.5">Mirá tus asistencias, pagos y plan</div>
                        </div>
                    </Link>
                </div>
            )}

            {mode === 'staff' && (
                <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl w-full max-w-sm">
                    <button
                        onClick={() => { setMode('select'); setError(''); }}
                        className="text-slate-400 hover:text-slate-200 text-sm mb-5 flex items-center gap-1"
                    >
                        ← Volver
                    </button>

                    <h1 className="text-xl font-bold text-white mb-6">Personal del gimnasio</h1>

                    {error && (
                        <div className="text-red-400 text-sm text-center mb-4 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Usuario</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Tu nombre de usuario"
                                required
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Tu contraseña"
                                required
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors mt-2"
                        >
                            Iniciar sesión
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
