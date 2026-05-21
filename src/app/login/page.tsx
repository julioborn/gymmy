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
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">

            {mode === 'select' && (
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">Ingresar</h1>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => setMode('staff')}
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white rounded-2xl p-5 text-left transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-white">Personal del gimnasio</p>
                                    <p className="text-slate-400 text-xs mt-0.5">Profesores, dueños y recepción</p>
                                </div>
                                <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </div>
                        </button>

                        <Link
                            href="/login/alumno"
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white rounded-2xl p-5 text-left transition-all group flex items-center gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white">Soy alumno</p>
                                <p className="text-slate-400 text-xs mt-0.5">Asistencias, pagos y plan activo</p>
                            </div>
                            <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </Link>
                    </div>
                </div>
            )}

            {mode === 'staff' && (
                <div className="w-full max-w-sm">
                    <button
                        onClick={() => { setMode('select'); setError(''); }}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors mb-6"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                        Volver
                    </button>

                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
                        <div className="mb-7">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-white">Personal del gimnasio</h1>
                            <p className="text-slate-400 text-sm mt-1">Ingresá con tu usuario y contraseña</p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                </svg>
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                    Usuario
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Tu nombre de usuario"
                                    required
                                    className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Tu contraseña"
                                    required
                                    className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-sm mt-2 flex items-center justify-center gap-2"
                            >
                                {loading ? <><Spinner /> Ingresando...</> : 'Ingresar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
