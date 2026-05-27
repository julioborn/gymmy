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

            {mode === 'select' && (
                <div className="w-full max-w-xs">
                    <div className="text-center mb-10">
                        <p className="text-slate-400 text-base">¿Cómo querés ingresar?</p>
                    </div>

                    <div className="space-y-2.5">
                        <button
                            onClick={() => setMode('staff')}
                            className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 rounded-2xl px-5 py-4 font-semibold text-sm transition-all flex items-center justify-between"
                        >
                            Personal de gimnasio
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>

                        <Link
                            href="/login/alumno"
                            className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 rounded-2xl px-5 py-4 font-semibold text-sm transition-all flex items-center justify-between"
                        >
                            Alumno
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </Link>
                    </div>
                </div>
            )}

            {mode === 'staff' && (
                <div className="w-full max-w-xs">
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
                        <h1 className="text-2xl font-bold text-white">Personal de gimnasio</h1>
                        <p className="text-slate-500 text-sm mt-1">Ingresá con tu usuario y contraseña</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Usuario"
                            required
                            autoCapitalize="none"
                            className="w-full bg-white text-slate-900 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-slate-400"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            required
                            className="w-full bg-white text-slate-900 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-slate-900 py-3.5 rounded-xl font-semibold text-sm transition-all mt-1 flex items-center justify-center gap-2"
                        >
                            {loading ? <><Spinner /> Ingresando...</> : 'Ingresar'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
