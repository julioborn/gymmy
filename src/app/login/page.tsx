"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = 'select' | 'staff';

function Spinner() {
    return (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>('select');
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const res = await signIn("staff-credentials", {
            redirect: false,
            username,
            password,
        });

        if (res?.error) {
            setError("Usuario o contraseña incorrectos.");
            setLoading(false);
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
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
            <div className="w-full max-w-xs">

                {mode === 'select' && (
                    <>
                        <div className="mb-8">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Acceso</p>
                            <h1 className="text-2xl font-bold text-white">¿Cómo querés ingresar?</h1>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setMode('staff')}
                                className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60 rounded-2xl px-4 py-4 text-left transition-all flex items-center gap-4"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white text-sm">Personal de gimnasio</p>
                                    <p className="text-slate-500 text-xs mt-0.5">Administradores y profesores</p>
                                </div>
                                <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>

                            <Link
                                href="/login/alumno"
                                className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60 rounded-2xl px-4 py-4 text-left transition-all flex items-center gap-4"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white text-sm">Alumno</p>
                                    <p className="text-slate-500 text-xs mt-0.5">Accedé a tu cuenta</p>
                                </div>
                                <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </Link>
                        </div>
                    </>
                )}

                {mode === 'staff' && (
                    <>
                        <button
                            onClick={() => { setMode('select'); setError(''); }}
                            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mb-8"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                            Volver
                        </button>

                        <div className="mb-7">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Personal</p>
                            <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                        Usuario
                                    </label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Nombre de usuario"
                                        required
                                        autoCapitalize="none"
                                        className="w-full bg-white text-slate-900 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 placeholder:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-white text-slate-900 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-slate-900 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <><Spinner /> Ingresando...</> : 'Ingresar'}
                            </button>
                        </form>
                    </>
                )}

            </div>
        </div>
    );
}
