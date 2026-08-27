'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type EjercicioPlan = {
    nombre: string;
    notas: string;
    semana1_5: string;
    semana2_6: string;
    semana3: string;
    semana4: string;
    kg: string;
};

type DiaPlan = {
    titulo: string;
    descripcion: string;
    bloqueActivacion: string;
    ejercicios: EjercicioPlan[];
};

type Plantilla = {
    _id: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    entradaCalor: { ejercicios: { nombre: string; notas: string }[] };
    dias: DiaPlan[];
    createdAt: string;
};

const CATEGORIAS = [
    'Fuerza',
    'Hipertrofia',
    'Rehabilitación',
    'Resistencia',
    'Pérdida de peso',
    'Tonificación',
    'General',
];

const CATEGORIA_COLORS: Record<string, string> = {
    'Fuerza': 'bg-red-100 text-red-700',
    'Hipertrofia': 'bg-slate-100 text-slate-700',
    'Rehabilitación': 'bg-amber-100 text-amber-700',
    'Resistencia': 'bg-orange-100 text-orange-700',
    'Pérdida de peso': 'bg-emerald-100 text-emerald-700',
    'Tonificación': 'bg-purple-100 text-purple-700',
    'General': 'bg-slate-100 text-slate-700',
};

function totalEjercicios(plantilla: Plantilla): number {
    return plantilla.dias.reduce((acc, dia) => acc + dia.ejercicios.length, 0);
}

export default function PlantillasPage() {
    const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('Todas');
    const [eliminando, setEliminando] = useState<string | null>(null);
    const [duplicando, setDuplicando] = useState<string | null>(null);

    const fetchPlantillas = async () => {
        try {
            const res = await fetch('/api/plantillas');
            if (res.ok) {
                const data = await res.json();
                setPlantillas(data);
            }
        } catch {
            // silenced
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlantillas();
    }, []);

    const handleEliminar = async (id: string, nombre: string) => {
        if (!window.confirm(`¿Eliminar la plantilla "${nombre}"? Esta acción no se puede deshacer.`)) return;
        setEliminando(id);
        try {
            const res = await fetch(`/api/plantillas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPlantillas(prev => prev.filter(p => p._id !== id));
            }
        } catch {
            // silenced
        } finally {
            setEliminando(null);
        }
    };

    const handleDuplicar = async (plantilla: Plantilla) => {
        setDuplicando(plantilla._id);
        try {
            const { _id, createdAt, ...rest } = plantilla;
            void _id; void createdAt;
            const res = await fetch('/api/plantillas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rest, nombre: `${rest.nombre} (copia)` }),
            });
            if (res.ok) {
                const nueva = await res.json();
                setPlantillas(prev => [...prev, nueva]);
            }
        } catch {
            // silenced
        } finally {
            setDuplicando(null);
        }
    };

    const categoriasFiltro = ['Todas', ...Array.from(new Set(plantillas.map(p => p.categoria))).sort()];

    const filtradas = filtro === 'Todas'
        ? plantillas
        : plantillas.filter(p => p.categoria === filtro);

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Header */}
            <div className="bg-[#111] rounded-3xl px-5 pt-5 pb-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-white leading-tight">Plantillas de entrenamiento</h1>
                            {!loading && (
                                <p className="text-slate-400 text-xs mt-0.5">{plantillas.length} plantilla{plantillas.length !== 1 ? 's' : ''}</p>
                            )}
                        </div>
                    </div>
                    <Link
                        href="/plantillas/nueva"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Nueva plantilla
                    </Link>
                </div>
            </div>

            {/* Filtros de categoría */}
            <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
                    {categoriasFiltro.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFiltro(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                filtro === cat
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : filtradas.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">No hay plantillas{filtro !== 'Todas' ? ` en "${filtro}"` : ''}</p>
                    <p className="text-slate-400 text-xs mt-1">Creá tu primera plantilla para empezar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filtradas.map(plantilla => {
                        const colorBadge = CATEGORIA_COLORS[plantilla.categoria] || 'bg-slate-100 text-slate-700';
                        const totalEj = totalEjercicios(plantilla);
                        return (
                            <div
                                key={plantilla._id}
                                className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 border border-slate-100"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${colorBadge}`}>
                                            {plantilla.categoria}
                                        </span>
                                        <h2 className="font-bold text-slate-900 text-sm leading-snug">{plantilla.nombre}</h2>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            {plantilla.dias.length} día{plantilla.dias.length !== 1 ? 's' : ''} · {totalEj} ejercicio{totalEj !== 1 ? 's' : ''} totales
                                        </p>
                                        {plantilla.descripcion && (
                                            <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">{plantilla.descripcion}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-auto">
                                    <Link
                                        href={`/plantillas/${plantilla._id}`}
                                        className="flex-1 text-center py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                                    >
                                        Editar
                                    </Link>
                                    <button
                                        onClick={() => handleDuplicar(plantilla)}
                                        disabled={duplicando === plantilla._id}
                                        className="flex-1 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {duplicando === plantilla._id ? 'Copiando...' : 'Duplicar'}
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(plantilla._id, plantilla.nombre)}
                                        disabled={eliminando === plantilla._id}
                                        className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all disabled:opacity-50 shrink-0"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
