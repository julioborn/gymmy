'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
        if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }

        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error al restablecer'); return; }
            setDone(true);
        } catch {
            setError('Ocurrió un error. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    if (!token) return (
        <p className="text-red-400 text-sm text-center">Link inválido.</p>
    );

    return done ? (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-lime-400/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-lime-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">¡Listo!</h2>
            <p className="text-white/50 text-sm mb-6">Tu contraseña fue actualizada.</p>
            <button onClick={() => router.push('/login')}
                className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors">
                Ir al login
            </button>
        </div>
    ) : (
        <>
            <h1 className="text-white text-2xl font-bold mb-1">Nueva contraseña</h1>
            <p className="text-white/50 text-sm mb-8">Ingresá tu nueva contraseña.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm"
                />
                <input
                    type="password"
                    placeholder="Repetir contraseña"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-60">
                    {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <Suspense fallback={null}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
