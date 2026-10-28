'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            setSent(true);
        } catch {
            setError('Ocurrió un error. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <button onClick={() => router.back()} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Volver
                </button>

                {sent ? (
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-lime-400/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-lime-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                        </div>
                        <h2 className="text-white text-xl font-bold mb-2">Revisá tu email</h2>
                        <p className="text-white/50 text-sm">Si tu email está registrado, vas a recibir un link para crear una nueva contraseña.</p>
                    </div>
                ) : (
                    <>
                        <h1 className="text-white text-2xl font-bold mb-1">Recuperar contraseña</h1>
                        <p className="text-white/50 text-sm mb-8">Ingresá tu email y te enviamos un link para crear una nueva.</p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm"
                            />
                            {error && <p className="text-red-400 text-xs">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-60"
                            >
                                {loading ? 'Enviando...' : 'Enviar link'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
