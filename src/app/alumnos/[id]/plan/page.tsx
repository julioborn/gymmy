'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { swalBase, swalDanger } from '@/utils/swalConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

type EjercicioAlumno = {
    nombre: string;
    notas: string;
    semana1: string;
    semana2: string;
    semana3: string;
    semana4: string;
    semana5: string;
    semana6: string;
    semana7: string;
    kg: string;
    grupoCombo: string;
};

const SEMANA_KEYS = ['semana1', 'semana2', 'semana3', 'semana4', 'semana5', 'semana6', 'semana7'] as const;

type DiaAlumno = {
    titulo: string;
    descripcion: string;
    bloqueActivacion: string;
    ejercicios: EjercicioAlumno[];
    _collapsed: boolean;
};

type PlanState = {
    nombre: string;
    categoria: string;
    descripcion: string;
    totalSemanas: number;
    fechaInicio: string;
    entradaCalor: { ejercicios: { nombre: string; notas: string }[] };
    dias: DiaAlumno[];
};

type Plantilla = {
    _id: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    entradaCalor: { ejercicios: { nombre: string; notas: string }[] };
    dias: {
        titulo: string;
        descripcion: string;
        bloqueActivacion: string;
        ejercicios: {
            nombre: string;
            notas: string;
            semana1_5: string;
            semana2_6: string;
            semana3: string;
            semana4: string;
            kg: string;
        }[];
    }[];
};

type Alumno = { _id: string; nombre: string; apellido: string };

const emptyEjercicio = (): EjercicioAlumno => ({
    nombre: '',
    notas: '',
    semana1: '',
    semana2: '',
    semana3: '',
    semana4: '',
    semana5: '',
    semana6: '',
    semana7: '',
    kg: '',
    grupoCombo: '',
});

const emptyDia = (): DiaAlumno => ({
    titulo: '',
    descripcion: '',
    bloqueActivacion: '',
    ejercicios: [emptyEjercicio()],
    _collapsed: false,
});

const todayStr = () => new Date().toISOString().slice(0, 10);

const plantillaToAlumnoPlan = (p: Plantilla): PlanState => ({
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    totalSemanas: 4,
    fechaInicio: todayStr(),
    entradaCalor: p.entradaCalor,
    dias: p.dias.map((d) => ({
        titulo: d.titulo,
        descripcion: d.descripcion,
        bloqueActivacion: d.bloqueActivacion,
        ejercicios: d.ejercicios.map((e) => ({
            nombre: e.nombre,
            notas: e.notas,
            semana1: e.semana1_5,
            semana2: e.semana2_6,
            semana3: e.semana3,
            semana4: e.semana4,
            semana5: '',
            semana6: '',
            semana7: '',
            kg: e.kg,
            grupoCombo: '',
        })),
        _collapsed: false,
    })),
});

const CATEGORIAS = ['Fuerza', 'Hipertrofia', 'Rehabilitación', 'Resistencia', 'Pérdida de peso', 'Tonificación', 'General'];

// ── Dark glass + glow helpers (mismo lenguaje visual del resto de la app) ──────
const cardNeutral: React.CSSProperties = { background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' };
const cardGlow: React.CSSProperties = { background: 'linear-gradient(165deg, rgba(16,185,129,0.06), rgba(17,17,17,0.9))', border: '1px solid rgba(16,185,129,0.22)', boxShadow: '0 0 0 1px rgba(16,185,129,0.03) inset, 0 8px 20px -12px rgba(16,185,129,0.22)' };
const inputCls = 'w-full border border-white/10 bg-white/[0.04] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400/50';
const inputSmCls = 'w-full border border-white/10 bg-white/[0.04] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-400/50';

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlanAlumnoPage() {
    const { id: alumnoId } = useParams<{ id: string }>();
    const router = useRouter();

    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [planId, setPlanId] = useState<string | null>(null);
    const [plan, setPlan] = useState<PlanState | null>(null);
    const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPlantillasModal, setShowPlantillasModal] = useState(false);

    const fetchData = useCallback(async () => {
        const [alumnoRes, planRes, plantillasRes] = await Promise.all([
            fetch(`/api/alumnos/${alumnoId}`),
            fetch(`/api/plan-alumno/alumno/${alumnoId}`),
            fetch('/api/plantillas'),
        ]);
        const alumnoData = await alumnoRes.json();
        const planData = planRes.ok ? await planRes.json() : null;
        const plantillasData = plantillasRes.ok ? await plantillasRes.json() : [];

        setAlumno(alumnoData);
        setPlantillas(plantillasData);

        if (planData) {
            setPlanId(planData._id);
            setPlan({
                nombre: planData.nombre,
                categoria: planData.categoria,
                descripcion: planData.descripcion,
                totalSemanas: planData.totalSemanas || 4,
                fechaInicio: planData.fechaInicio
                    ? new Date(planData.fechaInicio).toISOString().slice(0, 10)
                    : todayStr(),
                entradaCalor: planData.entradaCalor,
                dias: (planData.dias || []).map((d: DiaAlumno) => ({ ...d, _collapsed: true })),
            });
        }
        setLoading(false);
    }, [alumnoId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAsignarPlantilla = (plantilla: Plantilla) => {
        setPlan(plantillaToAlumnoPlan(plantilla));
        setPlanId(null);
        setShowPlantillasModal(false);
    };

    const handleSave = async () => {
        if (!plan) return;
        setSaving(true);
        try {
            const body = {
                alumnoId,
                nombre: plan.nombre,
                categoria: plan.categoria,
                descripcion: plan.descripcion,
                totalSemanas: plan.totalSemanas,
                fechaInicio: plan.fechaInicio,
                entradaCalor: plan.entradaCalor,
                dias: plan.dias.map(({ _collapsed, ...d }) => d),
            };

            let res;
            if (planId) {
                res = await fetch(`/api/plan-alumno/${planId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            } else {
                res = await fetch('/api/plan-alumno', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }

            if (!res.ok) throw new Error();
            const saved = await res.json();
            if (!planId) setPlanId(saved._id);

            await Swal.fire({ ...swalBase, icon: 'success', title: 'Plan guardado', timer: 1200, showConfirmButton: false });
        } catch {
            await Swal.fire({ ...swalBase, icon: 'error', title: 'Error al guardar' });
        } finally {
            setSaving(false);
        }
    };

    const handleEliminarPlan = async () => {
        if (!planId) return;
        const { isConfirmed } = await Swal.fire({
            ...swalDanger,
            title: 'Eliminar plan',
            text: '¿Seguro que querés eliminar el plan de este alumno?',
            confirmButtonText: 'Eliminar',
        });
        if (!isConfirmed) return;

        await fetch(`/api/plan-alumno/${planId}`, { method: 'DELETE' });
        setPlan(null);
        setPlanId(null);
    };

    // ── Helpers to mutate plan state ───────────────────────────────────────────

    const updateDia = (dIdx: number, field: keyof DiaAlumno, value: string | boolean) => {
        setPlan((prev) => {
            if (!prev) return prev;
            const dias = [...prev.dias];
            dias[dIdx] = { ...dias[dIdx], [field]: value };
            return { ...prev, dias };
        });
    };

    const updateEjercicio = (dIdx: number, eIdx: number, field: keyof EjercicioAlumno, value: string) => {
        setPlan((prev) => {
            if (!prev) return prev;
            const dias = [...prev.dias];
            const ejercicios = [...dias[dIdx].ejercicios];
            ejercicios[eIdx] = { ...ejercicios[eIdx], [field]: value };
            dias[dIdx] = { ...dias[dIdx], ejercicios };
            return { ...prev, dias };
        });
    };

    const addEjercicio = (dIdx: number) => {
        setPlan((prev) => {
            if (!prev) return prev;
            const dias = [...prev.dias];
            dias[dIdx] = { ...dias[dIdx], ejercicios: [...dias[dIdx].ejercicios, emptyEjercicio()] };
            return { ...prev, dias };
        });
    };

    const removeEjercicio = (dIdx: number, eIdx: number) => {
        setPlan((prev) => {
            if (!prev) return prev;
            const dias = [...prev.dias];
            const ejercicios = dias[dIdx].ejercicios.filter((_, i) => i !== eIdx);
            dias[dIdx] = { ...dias[dIdx], ejercicios };
            return { ...prev, dias };
        });
    };

    const addDia = () => {
        setPlan((prev) => {
            if (!prev) return prev;
            return { ...prev, dias: [...prev.dias, emptyDia()] };
        });
    };

    const removeDia = (dIdx: number) => {
        setPlan((prev) => {
            if (!prev) return prev;
            return { ...prev, dias: prev.dias.filter((_, i) => i !== dIdx) };
        });
    };

    const toggleCollapse = (dIdx: number) => {
        updateDia(dIdx, '_collapsed', !plan!.dias[dIdx]._collapsed);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#0a0a0a]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500/60" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-20">
            {/* Header */}
            <div className="bg-[#111] text-white px-4 pt-6 pb-8 rounded-b-3xl border-b border-white/5">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link
                        href={`/alumnos/${alumnoId}/historial`}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <p className="text-white/40 text-xs font-medium">Plan de entrenamiento</p>
                        <h1 className="text-lg font-bold truncate">
                            {alumno ? `${alumno.nombre} ${alumno.apellido}` : '...'}
                        </h1>
                    </div>
                    {plan && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
                {/* No plan assigned */}
                {!plan && (
                    <div className="rounded-2xl p-8 text-center mt-6" style={cardNeutral}>
                        <div className="w-14 h-14 bg-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                        </div>
                        <p className="text-white/80 font-semibold mb-1">Sin plan asignado</p>
                        <p className="text-white/40 text-sm mb-5">Elegí una plantilla como base o creá un plan desde cero</p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <button
                                onClick={() => setShowPlantillasModal(true)}
                                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors"
                            >
                                Usar plantilla
                            </button>
                            <button
                                onClick={() => setPlan({ nombre: '', categoria: '', descripcion: '', totalSemanas: 4, fechaInicio: todayStr(), entradaCalor: { ejercicios: [] }, dias: [emptyDia()] })}
                                className="px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white/80 text-sm font-semibold rounded-xl transition-colors"
                            >
                                Crear desde cero
                            </button>
                        </div>
                    </div>
                )}

                {/* Plan editor */}
                {plan && (
                    <>
                        {/* Datos generales */}
                        <div className="rounded-2xl p-4 space-y-3" style={cardGlow}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white/70 uppercase tracking-wide">Datos generales</h2>
                                <button
                                    onClick={() => setShowPlantillasModal(true)}
                                    className="text-xs text-emerald-400 font-semibold hover:text-emerald-300"
                                >
                                    Cambiar plantilla
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Nombre del plan"
                                value={plan.nombre}
                                onChange={(e) => setPlan((p) => p ? { ...p, nombre: e.target.value } : p)}
                                className={inputCls}
                            />
                            <select
                                value={plan.categoria}
                                onChange={(e) => setPlan((p) => p ? { ...p, categoria: e.target.value } : p)}
                                className={inputCls}
                            >
                                <option value="" className="bg-[#1a1a1a] text-white">Categoría</option>
                                {CATEGORIAS.map((c) => <option key={c} value={c} className="bg-[#1a1a1a] text-white">{c}</option>)}
                            </select>
                            <textarea
                                placeholder="Descripción (opcional)"
                                value={plan.descripcion}
                                onChange={(e) => setPlan((p) => p ? { ...p, descripcion: e.target.value } : p)}
                                rows={2}
                                className={`${inputCls} resize-none`}
                            />
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1 block">Fecha de inicio</label>
                                    <input
                                        type="date"
                                        value={plan.fechaInicio}
                                        onChange={(e) => setPlan((p) => p ? { ...p, fechaInicio: e.target.value } : p)}
                                        className={`${inputCls} [color-scheme:dark]`}
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1 block">Semanas</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={7}
                                        value={plan.totalSemanas}
                                        onChange={(e) => setPlan((p) => p ? { ...p, totalSemanas: Number(e.target.value) } : p)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Entrada en calor */}
                        {plan.entradaCalor.ejercicios.length > 0 && (
                            <div className="rounded-2xl p-4 space-y-2" style={cardNeutral}>
                                <h2 className="text-sm font-bold text-white/70 uppercase tracking-wide mb-3">Entrada en calor</h2>
                                {plan.entradaCalor.ejercicios.map((ej, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ejercicio"
                                            value={ej.nombre}
                                            onChange={(e) => {
                                                const ejercicios = [...plan.entradaCalor.ejercicios];
                                                ejercicios[i] = { ...ejercicios[i], nombre: e.target.value };
                                                setPlan((p) => p ? { ...p, entradaCalor: { ejercicios } } : p);
                                            }}
                                            className={`flex-1 ${inputSmCls}`}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Notas"
                                            value={ej.notas}
                                            onChange={(e) => {
                                                const ejercicios = [...plan.entradaCalor.ejercicios];
                                                ejercicios[i] = { ...ejercicios[i], notas: e.target.value };
                                                setPlan((p) => p ? { ...p, entradaCalor: { ejercicios } } : p);
                                            }}
                                            className={`flex-1 ${inputSmCls}`}
                                        />
                                        <button
                                            onClick={() => {
                                                const ejercicios = plan.entradaCalor.ejercicios.filter((_, j) => j !== i);
                                                setPlan((p) => p ? { ...p, entradaCalor: { ejercicios } } : p);
                                            }}
                                            className="w-8 h-9 flex items-center justify-center text-red-400 hover:text-red-300 shrink-0"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setPlan((p) => p ? { ...p, entradaCalor: { ejercicios: [...p.entradaCalor.ejercicios, { nombre: '', notas: '' }] } } : p)}
                                    className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 mt-1"
                                >
                                    + Agregar ejercicio
                                </button>
                            </div>
                        )}

                        {plan.entradaCalor.ejercicios.length === 0 && (
                            <button
                                onClick={() => setPlan((p) => p ? { ...p, entradaCalor: { ejercicios: [{ nombre: '', notas: '' }] } } : p)}
                                className="w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-xs text-white/40 font-semibold hover:border-white/25 hover:text-white/60 transition-colors"
                            >
                                + Agregar entrada en calor
                            </button>
                        )}

                        {/* Días */}
                        {(() => {
                            const numSemanas = Math.min(Math.max(plan.totalSemanas || 4, 1), 7);
                            const semanaCols = SEMANA_KEYS.slice(0, numSemanas);
                            return (
                        <div className="space-y-3">
                            {plan.dias.map((dia, dIdx) => (
                                <div key={dIdx} className="rounded-2xl overflow-hidden" style={cardNeutral}>
                                    {/* Day header */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/10">
                                        <button onClick={() => toggleCollapse(dIdx)} className="flex-1 flex items-center gap-2 text-left">
                                            <svg className={`w-4 h-4 text-white/40 transition-transform ${dia._collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                            <span className="text-xs font-bold text-white/60 uppercase tracking-wide">
                                                Día {dIdx + 1}{dia.titulo ? ` — ${dia.titulo}` : ''}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => removeDia(dIdx)}
                                            className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {!dia._collapsed && (
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Título del día"
                                                    value={dia.titulo}
                                                    onChange={(e) => updateDia(dIdx, 'titulo', e.target.value)}
                                                    className={inputSmCls}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Descripción"
                                                    value={dia.descripcion}
                                                    onChange={(e) => updateDia(dIdx, 'descripcion', e.target.value)}
                                                    className={inputSmCls}
                                                />
                                            </div>
                                            <textarea
                                                placeholder="Bloque de activación..."
                                                value={dia.bloqueActivacion}
                                                onChange={(e) => updateDia(dIdx, 'bloqueActivacion', e.target.value)}
                                                rows={2}
                                                className={`${inputSmCls} resize-none`}
                                            />

                                            {/* Exercise table */}
                                            <div className="overflow-x-auto -mx-4 px-4">
                                                <table className="w-full text-xs min-w-[580px]">
                                                    <thead>
                                                        <tr className="text-white/40">
                                                            <th className="text-left font-semibold pb-1.5 pr-2 w-36">Ejercicio</th>
                                                            {semanaCols.map((sem, i) => (
                                                                <th key={sem} className="text-center font-semibold pb-1.5 px-1">Sem {i + 1}</th>
                                                            ))}
                                                            <th className="text-center font-semibold pb-1.5 px-1 text-emerald-400/70">KG ref</th>
                                                            <th className="text-center font-semibold pb-1.5 px-1 w-14" title="Marcá con la misma letra los ejercicios combinados (superset)">Combo</th>
                                                            <th className="w-6" />
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/[0.06]">
                                                        {dia.ejercicios.map((ej, eIdx) => (
                                                            <tr key={eIdx}>
                                                                <td className="pr-2 py-1">
                                                                    <div className="space-y-1">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Nombre"
                                                                            value={ej.nombre}
                                                                            onChange={(e) => updateEjercicio(dIdx, eIdx, 'nombre', e.target.value)}
                                                                            className={inputSmCls}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Notas"
                                                                            value={ej.notas}
                                                                            onChange={(e) => updateEjercicio(dIdx, eIdx, 'notas', e.target.value)}
                                                                            className={`${inputSmCls} text-white/40`}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                {semanaCols.map((sem) => (
                                                                    <td key={sem} className="px-1 py-1">
                                                                        <input
                                                                            type="text"
                                                                            value={ej[sem]}
                                                                            onChange={(e) => updateEjercicio(dIdx, eIdx, sem, e.target.value)}
                                                                            className={`${inputSmCls} text-center`}
                                                                        />
                                                                    </td>
                                                                ))}
                                                                <td className="px-1 py-1">
                                                                    <input
                                                                        type="text"
                                                                        value={ej.kg}
                                                                        onChange={(e) => updateEjercicio(dIdx, eIdx, 'kg', e.target.value)}
                                                                        className="w-full border border-emerald-400/25 bg-emerald-400/[0.07] rounded-lg px-2 py-1.5 text-xs text-center text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
                                                                    />
                                                                </td>
                                                                <td className="px-1 py-1">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="—"
                                                                        value={ej.grupoCombo}
                                                                        onChange={(e) => updateEjercicio(dIdx, eIdx, 'grupoCombo', e.target.value)}
                                                                        className={`${inputSmCls} text-center`}
                                                                    />
                                                                </td>
                                                                <td className="py-1 pl-1">
                                                                    <button
                                                                        onClick={() => removeEjercicio(dIdx, eIdx)}
                                                                        className="w-6 h-6 flex items-center justify-center text-red-400/60 hover:text-red-400"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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
                                                onClick={() => addEjercicio(dIdx)}
                                                className="text-xs text-emerald-400 font-semibold hover:text-emerald-300"
                                            >
                                                + Agregar ejercicio
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={addDia}
                                className="w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-xs text-white/40 font-semibold hover:border-emerald-400/30 hover:text-emerald-400 transition-colors"
                            >
                                + Agregar día
                            </button>
                        </div>
                            );
                        })()}

                        {/* Delete plan */}
                        {planId && (
                            <div className="pt-2 pb-4">
                                <button
                                    onClick={handleEliminarPlan}
                                    className="w-full py-2.5 text-xs font-semibold text-red-400/70 hover:text-red-400 transition-colors"
                                >
                                    Eliminar plan del alumno
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Plantillas modal */}
            {showPlantillasModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.06), #111111)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="font-bold text-white">Elegir plantilla</h3>
                            <button
                                onClick={() => setShowPlantillasModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {plantillas.length === 0 && (
                                <p className="text-center text-white/40 text-sm py-8">No hay plantillas creadas</p>
                            )}
                            {plantillas.map((p) => (
                                <button
                                    key={p._id}
                                    onClick={() => handleAsignarPlantilla(p)}
                                    className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-emerald-400/30 hover:bg-emerald-400/[0.06] transition-colors"
                                >
                                    <p className="font-semibold text-white text-sm">{p.nombre}</p>
                                    <p className="text-white/40 text-xs mt-0.5">
                                        {p.categoria} · {p.dias.length} día{p.dias.length !== 1 ? 's' : ''}
                                    </p>
                                    {p.descripcion && <p className="text-white/40 text-xs mt-1 line-clamp-1">{p.descripcion}</p>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
