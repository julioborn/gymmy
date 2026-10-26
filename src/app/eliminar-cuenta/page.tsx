'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function EliminarCuentaPage() {
    const [tipo, setTipo] = useState<'alumno' | 'staff'>('alumno');
    const [valor, setValor] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [mensaje, setMensaje] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!valor.trim()) return;
        setStatus('loading');
        try {
            const res = await fetch('/api/eliminar-cuenta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, valor: valor.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                setMensaje(data.message || 'Tu cuenta fue eliminada correctamente.');
            } else {
                setStatus('error');
                setMensaje(data.error || 'No encontramos una cuenta con esos datos.');
            }
        } catch {
            setStatus('error');
            setMensaje('Error de conexión. Intentá de nuevo más tarde.');
        }
    }

    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-16">
            <div className="mb-8">
                <Image src="/sporttime-logo.png" alt="Sport Time" width={100} height={100} className="rounded-3xl" priority />
            </div>

            <h1 className="text-white text-2xl font-bold mb-1 text-center">SportTime</h1>
            <h2 className="text-white/60 text-base font-semibold mb-2 text-center">Eliminar cuenta</h2>
            <p className="text-white/50 text-sm text-center mb-8 max-w-xs">
                Ingresá tu {tipo === 'alumno' ? 'DNI' : 'email o nombre de usuario'} para eliminar tu cuenta y todos tus datos de forma permanente.
            </p>

            {status === 'success' ? (
                <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-2xl px-6 py-5 text-center max-w-xs">
                    <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-emerald-300 font-semibold">{mensaje}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
                    <div className="flex rounded-2xl overflow-hidden border border-white/20">
                        <button
                            type="button"
                            onClick={() => { setTipo('alumno'); setValor(''); }}
                            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tipo === 'alumno' ? 'bg-white text-black' : 'bg-transparent text-white/50'}`}
                        >
                            Alumno
                        </button>
                        <button
                            type="button"
                            onClick={() => { setTipo('staff'); setValor(''); }}
                            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tipo === 'staff' ? 'bg-white text-black' : 'bg-transparent text-white/50'}`}
                        >
                            Staff
                        </button>
                    </div>

                    <input
                        type={tipo === 'alumno' ? 'text' : 'email'}
                        inputMode={tipo === 'alumno' ? 'numeric' : 'email'}
                        placeholder={tipo === 'alumno' ? 'Tu DNI (sin puntos)' : 'Tu email o usuario'}
                        value={valor}
                        onChange={e => setValor(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-white/50"
                        required
                    />

                    {status === 'error' && (
                        <p className="text-red-400 text-sm text-center">{mensaje}</p>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl px-5 py-4 transition-all active:scale-95"
                    >
                        {status === 'loading' ? 'Eliminando...' : 'Eliminar mi cuenta'}
                    </button>

                    <p className="text-white/30 text-xs text-center leading-relaxed">
                        Esta acción es permanente e irreversible. Se eliminarán todos tus datos personales.
                    </p>
                </form>
            )}
        </main>
    );
}
