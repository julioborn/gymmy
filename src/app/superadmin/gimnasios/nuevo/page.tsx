'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoGimnasioPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        nombre: '',
        adminUsername: '',
        adminPassword: '',
        fechaVencimiento: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/superadmin/gimnasios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al crear el gimnasio');
                return;
            }

            router.push('/superadmin');
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-lg mx-auto py-8 px-4">
            <div className="mb-6">
                <Link href="/superadmin" className="text-slate-400 hover:text-slate-200 text-sm">
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white mt-3">Nuevo Gimnasio</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Creá el gimnasio y el usuario administrador de acceso.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
                <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1">
                        Nombre del gimnasio
                    </label>
                    <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        required
                        placeholder="Ej: Gimnasio Fuerza Total"
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                </div>

                <div className="border-t border-slate-700 pt-4">
                    <p className="text-slate-400 text-xs mb-3 uppercase tracking-wide">Usuario administrador</p>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-1">
                                Username
                            </label>
                            <input
                                name="adminUsername"
                                value={form.adminUsername}
                                onChange={handleChange}
                                required
                                placeholder="Ej: admin_fuerza"
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-1">
                                Contraseña
                            </label>
                            <input
                                name="adminPassword"
                                type="password"
                                value={form.adminPassword}
                                onChange={handleChange}
                                required
                                placeholder="Contraseña segura"
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1">
                        Fecha de vencimiento <span className="text-slate-500">(opcional)</span>
                    </label>
                    <input
                        name="fechaVencimiento"
                        type="date"
                        value={form.fechaVencimiento}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-3 py-2 text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                    {loading ? 'Creando...' : 'Crear Gimnasio'}
                </button>
            </form>
        </div>
    );
}
