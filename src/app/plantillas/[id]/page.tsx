'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

type EjercicioPlan = {
    nombre: string;
    notas: string;
    semana1_5: string;
    semana2_6: string;
    semana3: string;
    semana4: string;
    kg: string;
};

type EntradaCalorEj = {
    nombre: string;
    notas: string;
};

type DiaPlan = {
    titulo: string;
    descripcion: string;
    bloqueActivacion: string;
    ejercicios: EjercicioPlan[];
    _collapsed: boolean;
};

type FormState = {
    nombre: string;
    categoria: string;
    descripcion: string;
    entradaCalor: { ejercicios: EntradaCalorEj[] };
    dias: DiaPlan[];
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

const emptyEjercicio = (): EjercicioPlan => ({
    nombre: '', notas: '', semana1_5: '', semana2_6: '', semana3: '', semana4: '', kg: '',
});

const emptyDia = (index: number): DiaPlan => ({
    titulo: `Día ${index + 1}`,
    descripcion: '',
    bloqueActivacion: '',
    ejercicios: [emptyEjercicio()],
    _collapsed: false,
});

const inputCls = "border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 w-full bg-white";
const inputSmCls = "border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white w-full";

// ── Component ──────────────────────────────────────────────────────────────────

export default function EditorPlantillaPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const isNew = params.id === 'nueva';

    const [form, setForm] = useState<FormState>({
        nombre: '',
        categoria: 'General',
        descripcion: '',
        entradaCalor: { ejercicios: [] },
        dias: [],
    });
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Load existing template
    useEffect(() => {
        if (isNew) return;
        const load = async () => {
            try {
                const res = await fetch(`/api/plantillas/${params.id}`);
                if (!res.ok) { setError('Plantilla no encontrada'); return; }
                const data = await res.json();
                setForm({
                    nombre: data.nombre || '',
                    categoria: data.categoria || 'General',
                    descripcion: data.descripcion || '',
                    entradaCalor: data.entradaCalor || { ejercicios: [] },
                    dias: (data.dias || []).map((d: any) => ({ ...d, _collapsed: false })),
                });
            } catch {
                setError('Error al cargar la plantilla');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [params.id, isNew]);

    // ── Save ─────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        setError('');
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
        if (form.dias.length === 0) { setError('Agregá al menos un día de entrenamiento'); return; }
        for (const dia of form.dias) {
            if (dia.ejercicios.length === 0) {
                setError(`El "${dia.titulo}" no tiene ejercicios. Agregá al menos uno.`);
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                nombre: form.nombre.trim(),
                categoria: form.categoria,
                descripcion: form.descripcion,
                entradaCalor: form.entradaCalor,
                dias: form.dias.map(({ _collapsed, ...rest }) => rest),
            };

            const res = isNew
                ? await fetch('/api/plantillas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                : await fetch(`/api/plantillas/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

            if (res.ok) {
                router.push('/plantillas');
            } else {
                const data = await res.json();
                setError(data.error || 'Error al guardar');
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    // ── Form helpers ─────────────────────────────────────────────────────────

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    // Entrada en calor
    const addCalorEj = () => {
        setForm(prev => ({
            ...prev,
            entradaCalor: {
                ejercicios: [...prev.entradaCalor.ejercicios, { nombre: '', notas: '' }],
            },
        }));
    };

    const updateCalorEj = (i: number, field: keyof EntradaCalorEj, value: string) => {
        setForm(prev => {
            const ejs = [...prev.entradaCalor.ejercicios];
            ejs[i] = { ...ejs[i], [field]: value };
            return { ...prev, entradaCalor: { ejercicios: ejs } };
        });
    };

    const removeCalorEj = (i: number) => {
        setForm(prev => ({
            ...prev,
            entradaCalor: { ejercicios: prev.entradaCalor.ejercicios.filter((_, idx) => idx !== i) },
        }));
    };

    // Días
    const addDia = () => {
        setForm(prev => ({
            ...prev,
            dias: [...prev.dias, emptyDia(prev.dias.length)],
        }));
    };

    const removeDia = (i: number) => {
        setForm(prev => ({ ...prev, dias: prev.dias.filter((_, idx) => idx !== i) }));
    };

    const moveDia = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        setForm(prev => {
            const dias = [...prev.dias];
            [dias[i], dias[j]] = [dias[j], dias[i]];
            return { ...prev, dias };
        });
    };

    const updateDiaField = (i: number, field: keyof Omit<DiaPlan, 'ejercicios' | '_collapsed'>, value: string) => {
        setForm(prev => {
            const dias = [...prev.dias];
            dias[i] = { ...dias[i], [field]: value };
            return { ...prev, dias };
        });
    };

    const toggleCollapse = (i: number) => {
        setForm(prev => {
            const dias = [...prev.dias];
            dias[i] = { ...dias[i], _collapsed: !dias[i]._collapsed };
            return { ...prev, dias };
        });
    };

    // Ejercicios de días
    const addEjercicio = (diaIdx: number) => {
        setForm(prev => {
            const dias = [...prev.dias];
            dias[diaIdx] = { ...dias[diaIdx], ejercicios: [...dias[diaIdx].ejercicios, emptyEjercicio()] };
            return { ...prev, dias };
        });
    };

    const removeEjercicio = (diaIdx: number, ejIdx: number) => {
        setForm(prev => {
            const dias = [...prev.dias];
            dias[diaIdx] = { ...dias[diaIdx], ejercicios: dias[diaIdx].ejercicios.filter((_, idx) => idx !== ejIdx) };
            return { ...prev, dias };
        });
    };

    const updateEjercicio = (diaIdx: number, ejIdx: number, field: keyof EjercicioPlan, value: string) => {
        setForm(prev => {
            const dias = [...prev.dias];
            const ejs = [...dias[diaIdx].ejercicios];
            ejs[ejIdx] = { ...ejs[ejIdx], [field]: value };
            dias[diaIdx] = { ...dias[diaIdx], ejercicios: ejs };
            return { ...prev, dias };
        });
    };

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">
                <div className="h-16 rounded-3xl bg-slate-200 animate-pulse" />
                <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Header */}
            <div className="bg-slate-900 rounded-3xl px-5 pt-5 pb-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href="/plantillas"
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/10 shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </Link>
                        <h1 className="text-base font-bold text-white leading-tight truncate">
                            {isNew ? 'Nueva plantilla' : (form.nombre || 'Editar plantilla')}
                        </h1>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
                    >
                        {saving ? (
                            <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                Guardar
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {error}
                </div>
            )}

            {/* Datos generales */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Datos generales</p>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Nombre</label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={e => setField('nombre', e.target.value)}
                            className={inputCls}
                            placeholder="Ej: Plan de fuerza 12 semanas"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Categoría</label>
                            <select
                                value={form.categoria}
                                onChange={e => setField('categoria', e.target.value)}
                                className={inputCls}
                            >
                                {CATEGORIAS.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Descripción (opcional)</label>
                        <textarea
                            value={form.descripcion}
                            onChange={e => setField('descripcion', e.target.value)}
                            className={`${inputCls} resize-none`}
                            rows={2}
                            placeholder="Descripción breve del plan, objetivos, etc."
                        />
                    </div>
                </div>
            </div>

            {/* Entrada en calor */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Entrada en calor</p>
                    <button
                        onClick={addCalorEj}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Agregar ejercicio
                    </button>
                </div>
                <div className="p-5 space-y-2">
                    {form.entradaCalor.ejercicios.length === 0 ? (
                        <p className="text-slate-400 text-xs text-center py-4">Sin ejercicios de entrada en calor</p>
                    ) : (
                        form.entradaCalor.ejercicios.map((ej, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={ej.nombre}
                                    onChange={e => updateCalorEj(i, 'nombre', e.target.value)}
                                    className={`${inputCls} flex-1`}
                                    placeholder="Ejercicio"
                                />
                                <input
                                    type="text"
                                    value={ej.notas}
                                    onChange={e => updateCalorEj(i, 'notas', e.target.value)}
                                    className={`${inputCls} flex-1`}
                                    placeholder="Notas opcionales"
                                />
                                <button
                                    onClick={() => removeCalorEj(i)}
                                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Días de entrenamiento */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Días de entrenamiento</p>
                    <button
                        onClick={addDia}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Agregar día
                    </button>
                </div>

                {form.dias.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                        <p className="text-slate-400 text-sm">No hay días. Hacé clic en "Agregar día" para empezar.</p>
                    </div>
                )}

                {form.dias.map((dia, diaIdx) => (
                    <div key={diaIdx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        {/* Day header */}
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                            <input
                                type="text"
                                value={dia.titulo}
                                onChange={e => updateDiaField(diaIdx, 'titulo', e.target.value)}
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white w-28 shrink-0"
                                placeholder="Día 1"
                            />
                            <input
                                type="text"
                                value={dia.descripcion}
                                onChange={e => updateDiaField(diaIdx, 'descripcion', e.target.value)}
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white flex-1 min-w-0"
                                placeholder="Descripción (ej: tren inferior)"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => moveDia(diaIdx, -1)}
                                    disabled={diaIdx === 0}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-30"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => moveDia(diaIdx, 1)}
                                    disabled={diaIdx === form.dias.length - 1}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-30"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => toggleCollapse(diaIdx)}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                                >
                                    <svg className={`w-4 h-4 transition-transform ${dia._collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => removeDia(diaIdx)}
                                    className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Day body */}
                        {!dia._collapsed && (
                            <div className="p-4 space-y-4">
                                {/* Bloque de activación */}
                                <div>
                                    <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Bloque de activación</label>
                                    <input
                                        type="text"
                                        value={dia.bloqueActivacion}
                                        onChange={e => updateDiaField(diaIdx, 'bloqueActivacion', e.target.value)}
                                        className={inputCls}
                                        placeholder="Ej: Tirones / cargada estricta"
                                    />
                                </div>

                                {/* Exercise table */}
                                <div>
                                    <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-2">Ejercicios</label>
                                    <div className="overflow-x-auto -mx-1">
                                        <table className="w-full text-xs border-collapse" style={{ minWidth: 580 }}>
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide" style={{ minWidth: 160 }}>Ejercicio</th>
                                                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide" style={{ minWidth: 80 }}>Sem 1/5</th>
                                                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide" style={{ minWidth: 80 }}>Sem 2/6</th>
                                                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide" style={{ minWidth: 80 }}>Sem 3</th>
                                                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide" style={{ minWidth: 80 }}>Sem 4</th>
                                                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide" style={{ minWidth: 70 }}>KG</th>
                                                    <th className="py-1.5 px-1" style={{ width: 32 }} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dia.ejercicios.map((ej, ejIdx) => (
                                                    <tr key={ejIdx} className="border-b border-slate-50 hover:bg-slate-50/60">
                                                        <td className="py-1 px-2">
                                                            <input
                                                                type="text"
                                                                value={ej.nombre}
                                                                onChange={e => updateEjercicio(diaIdx, ejIdx, 'nombre', e.target.value)}
                                                                className={inputSmCls}
                                                                placeholder="Nombre"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={ej.notas}
                                                                onChange={e => updateEjercicio(diaIdx, ejIdx, 'notas', e.target.value)}
                                                                className={`${inputSmCls} mt-1 text-[10px] text-slate-500`}
                                                                placeholder="Notas"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            <input
                                                                type="text"
                                                                value={ej.semana1_5}
                                                                onChange={e => updateEjercicio(diaIdx, ejIdx, 'semana1_5', e.target.value)}
                                                                className={inputSmCls}
                                                                placeholder="3x8"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            <input
                                                                type="text"
                                                                value={ej.semana2_6}
                                                                onChange={e => updateEjercicio(diaIdx, ejIdx, 'semana2_6', e.target.value)}
                                                                className={inputSmCls}
                                                                placeholder="4x6"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            <input
                                                                type="text"
                                                                value={ej.semana3}
                                                                onChange={e => updateEjercicio(diaIdx, ejIdx, 'semana3', e.target.value)}
                                                                className={inputSmCls}
                                                                placeholder="5x5"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            <input
                                                                type="text"
                                                                value={ej.semana4}
                                                                onChange={e => updateEjercicio(diaIdx, ejIdx, 'semana4', e.target.value)}
                                                                className={inputSmCls}
                                                                placeholder="6x4"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            <input
                                                                type="text"
                                                                value={ej.kg}
                                                                onChange={e => updateEjercicio(diaIdx, ejIdx, 'kg', e.target.value)}
                                                                className={inputSmCls}
                                                                placeholder="60"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-1">
                                                            <button
                                                                onClick={() => removeEjercicio(diaIdx, ejIdx)}
                                                                className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button
                                        onClick={() => addEjercicio(diaIdx)}
                                        className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-all"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Agregar ejercicio
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Bottom save button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-2xl transition shadow-sm text-sm"
            >
                {saving ? 'Guardando...' : 'Guardar plantilla'}
            </button>
        </div>
    );
}
