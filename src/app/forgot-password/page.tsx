'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ForgotPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dni = searchParams.get('dni') || '';
    const gimnasioId = searchParams.get('gimnasioId') || '';

    const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
    const [hasEmail, setHasEmail] = useState(false);
    const [editing, setEditing] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [fetching, setFetching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!dni || !gimnasioId) return;
        setFetching(true);
        fetch(`/api/auth/forgot-password?dni=${dni}&gimnasioId=${gimnasioId}`)
            .then(r => r.json())
            .then(data => {
                setMaskedEmail(data.email);
                setHasEmail(data.hasEmail);
                if (!data.hasEmail) setEditing(true);
            })
            .finally(() => setFetching(false));
    }, [dni, gimnasioId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Si está editando o no tiene email, necesita el nuevo email
        if (editing && !newEmail) { setError('Ingresá un email'); return; }

        setLoading(true);
        setError('');
        try {
            const body: Record<string, string> = {};
            if (dni) body.dni = dni;
            if (gimnasioId) body.gimnasioId = gimnasioId;
            // Si está cambiando el email, lo manda; si usa el registrado, no manda email (el server lo saca de DB)
            if (editing && newEmail) body.email = newEmail;

            await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            setSent(true);
        } catch {
            setError('Ocurrió un error. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    if (sent) return (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-lime-400/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-lime-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 0-2.25 2.25M21.75 6.75v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Revisá tu email</h2>
            <p className="text-white/50 text-sm">Te enviamos un link para crear una nueva contraseña.</p>
        </div>
    );

    return (
        <>
            <h1 className="text-white text-2xl font-bold mb-1">Recuperar contraseña</h1>
            <p className="text-white/50 text-sm mb-8">Te enviamos un link al email para crear una nueva contraseña.</p>

            {fetching ? (
                <div className="flex justify-center py-8">
                    <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {/* Tiene email registrado y NO está editando */}
                    {hasEmail && !editing && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                            <p className="text-white/40 text-xs mb-1">Email registrado</p>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-white font-semibold text-sm truncate">{maskedEmail}</p>
                                <button type="button" onClick={() => setEditing(true)}
                                    className="text-orange-400 text-xs font-semibold hover:text-orange-300 shrink-0">
                                    Cambiar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Editando o sin email: mostrar input */}
                    {editing && (
                        <div>
                            {hasEmail && (
                                <button type="button" onClick={() => { setEditing(false); setNewEmail(''); }}
                                    className="flex items-center gap-1 text-white/40 text-xs mb-3 hover:text-white/60">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                    </svg>
                                    Usar el email registrado
                                </button>
                            )}
                            <input
                                type="email"
                                placeholder={hasEmail ? 'Nuevo email' : 'Ingresá tu email'}
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                required
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm"
                            />
                            {!hasEmail && (
                                <p className="text-white/30 text-xs mt-2">Este email se va a guardar en tu perfil.</p>
                            )}
                        </div>
                    )}

                    {/* Sin contexto de DNI: input libre */}
                    {!dni && !gimnasioId && (
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm"
                        />
                    )}

                    {error && <p className="text-red-400 text-xs">{error}</p>}

                    <button type="submit" disabled={loading}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-60">
                        {loading ? 'Enviando...' : 'Enviar link'}
                    </button>
                </form>
            )}
        </>
    );
}

export default function ForgotPasswordPage() {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <button onClick={() => router.back()} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Volver
                </button>
                <Suspense fallback={null}>
                    <ForgotPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
