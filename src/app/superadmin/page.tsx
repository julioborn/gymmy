'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Gimnasio {
    _id: string;
    nombre: string;
    activo: boolean;
    fechaVencimiento?: string;
    totalAlumnos: number;
    createdAt: string;
}

export default function SuperAdminPage() {
    const [gimnasios, setGimnasios] = useState<Gimnasio[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchGimnasios();
    }, []);

    async function fetchGimnasios() {
        setLoading(true);
        const res = await fetch('/api/superadmin/gimnasios');
        if (res.ok) {
            const data = await res.json();
            setGimnasios(data);
        }
        setLoading(false);
    }

    async function toggleActivo(id: string, activo: boolean) {
        await fetch(`/api/superadmin/gimnasios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: !activo }),
        });
        fetchGimnasios();
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
                    <p className="text-slate-400 text-sm mt-1">Gestión de gimnasios y suscripciones</p>
                </div>
                <Link
                    href="/superadmin/gimnasios/nuevo"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                    + Nuevo Gimnasio
                </Link>
            </div>

            {loading ? (
                <div className="text-slate-400 text-center py-16">Cargando...</div>
            ) : gimnasios.length === 0 ? (
                <div className="text-slate-500 text-center py-16">
                    No hay gimnasios registrados todavía.
                </div>
            ) : (
                <div className="grid gap-4">
                    {gimnasios.map((g) => {
                        const vence = g.fechaVencimiento ? new Date(g.fechaVencimiento) : null;
                        const diasParaVencer = vence
                            ? Math.ceil((vence.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                            : null;

                        return (
                            <div
                                key={g._id}
                                className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4"
                            >
                                <div
                                    className={`w-3 h-3 rounded-full flex-shrink-0 ${g.activo ? 'bg-emerald-400' : 'bg-red-400'}`}
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-semibold text-base">{g.nombre}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.activo ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                                            {g.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 mt-1 text-sm text-slate-400">
                                        <span>{g.totalAlumnos} alumnos</span>
                                        {vence && (
                                            <span className={diasParaVencer !== null && diasParaVencer <= 7 ? 'text-amber-400' : ''}>
                                                Vence: {vence.toLocaleDateString('es-AR')}
                                                {diasParaVencer !== null && diasParaVencer <= 30 && (
                                                    <span className="ml-1">({diasParaVencer}d)</span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Link
                                        href={`/superadmin/gimnasios/${g._id}`}
                                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-sm transition-colors"
                                    >
                                        Gestionar
                                    </Link>
                                    <button
                                        onClick={() => toggleActivo(g._id, g.activo)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                            g.activo
                                                ? 'bg-red-900/40 hover:bg-red-900/70 text-red-400'
                                                : 'bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-400'
                                        }`}
                                    >
                                        {g.activo ? 'Desactivar' : 'Activar'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{gimnasios.length}</div>
                    <div className="text-slate-400 text-sm mt-1">Gimnasios totales</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                        {gimnasios.filter(g => g.activo).length}
                    </div>
                    <div className="text-slate-400 text-sm mt-1">Activos</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                        {gimnasios.reduce((sum, g) => sum + g.totalAlumnos, 0)}
                    </div>
                    <div className="text-slate-400 text-sm mt-1">Alumnos totales</div>
                </div>
            </div>
        </div>
    );
}
