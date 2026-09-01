'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Empleado = {
    _id: string;
    username: string;
    role: string;
    nombre?: string;
    apellido?: string;
    dni?: string;
};

type EjercicioAsignado = {
    nombre: string; notas: string;
    semana1: string; semana2: string; semana3: string; semana4: string; semana5: string;
    kg: string;
    kgAlumno1: string; kgAlumno2: string; kgAlumno3: string; kgAlumno4: string; kgAlumno5: string;
    observacionesAlumno1: string; observacionesAlumno2: string; observacionesAlumno3: string; observacionesAlumno4: string; observacionesAlumno5: string;
    grupoCombo: string;
};

type DiaAsignado = {
    titulo: string; descripcion: string; bloqueActivacion: string;
    ejercicios: EjercicioAsignado[];
};

type PlanEj = {
    _id: string; nombre: string; categoria: string; descripcion: string;
    totalSemanas: number; fechaInicio?: string;
    entradaCalor: { ejercicios: { nombre: string; notas: string }[] };
    dias: DiaAsignado[];
};

const ROLE_LABEL: Record<string, string> = { dueño: 'Dueño', admin: 'Admin', profesor: 'Profesor', registro: 'Registro' };
const ROLE_AVATAR: Record<string, string> = { dueño: 'bg-slate-700', admin: 'bg-slate-800', profesor: 'bg-violet-500', registro: 'bg-amber-400' };

const COMBO_PALETTE = [
    { bg: 'rgba(244,163,71,0.07)', labelColor: '#d97706', dotColor: '#d97706' },
    { bg: 'rgba(16,185,129,0.07)', labelColor: '#059669', dotColor: '#059669' },
    { bg: 'rgba(59,130,246,0.07)', labelColor: '#2563eb', dotColor: '#2563eb' },
    { bg: 'rgba(139,92,246,0.07)', labelColor: '#7c3aed', dotColor: '#7c3aed' },
];

function getSemanaField(ej: EjercicioAsignado, sem: number): string {
    const map: Record<number, keyof EjercicioAsignado> = { 1: 'semana1', 2: 'semana2', 3: 'semana3', 4: 'semana4', 5: 'semana5' };
    return (ej[map[sem]] as string) || '';
}

function IconChevron({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    );
}

export default function EmpleadoPerfilPage() {
    const { id } = useParams<{ id: string }>();
    const { data: session } = useSession();

    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [planEj, setPlanEj] = useState<PlanEj | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [acento, setAcento] = useState('#111111');
    const [acento2, setAcento2] = useState('#111111');
    const [selectedSemana, setSelectedSemana] = useState(1);
    const [selectedDia, setSelectedDia] = useState(0);
    const [expandedEj, setExpandedEj] = useState<number | null>(null);
    const [savingEj, setSavingEj] = useState<number | null>(null);

    const myRole = session?.user?.role;
    const myId = session?.user?.id;
    const isAdmin = myRole === 'dueño' || myRole === 'admin';

    useEffect(() => {
        fetch('/api/gimnasio/tema').then(r => r.json()).then(d => {
            if (d.temaAcento) setAcento(d.temaAcento);
            if (d.temaAcento2) setAcento2(d.temaAcento2);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetch(`/api/empleados/${id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { setEmpleado(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        setLoadingPlan(true);
        fetch(`/api/plan-alumno/alumno/${id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                setPlanEj(data);
                if (data?.totalSemanas) setSelectedSemana(1);
            })
            .catch(() => {})
            .finally(() => setLoadingPlan(false));
    }, [id]);

    function updateEj(eIdx: number, field: string, value: string) {
        setPlanEj(prev => {
            if (!prev) return prev;
            const dias = prev.dias.map((d, di) => {
                if (di !== selectedDia) return d;
                return { ...d, ejercicios: d.ejercicios.map((e, ei) => ei === eIdx ? { ...e, [field]: value } : e) };
            });
            return { ...prev, dias };
        });
    }

    async function handleSaveEj(eIdx: number) {
        if (!planEj || !id) return;
        setSavingEj(eIdx);
        try {
            await fetch(`/api/plan-alumno/alumno/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: planEj._id, dias: planEj.dias }),
            });
            setExpandedEj(null);
        } finally {
            setSavingEj(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="border-t-2 border-r-2 rounded-full w-8 h-8 animate-spin" style={{ borderTopColor: acento, borderRightColor: acento }} />
            </div>
        );
    }

    if (!empleado) {
        return <div className="text-slate-400 text-center py-16 text-sm">No se pudo cargar el perfil.</div>;
    }

    const displayName = empleado.nombre && empleado.apellido
        ? `${empleado.nombre} ${empleado.apellido}`
        : empleado.nombre || empleado.username;
    const initials = empleado.nombre
        ? `${empleado.nombre[0]}${empleado.apellido?.[0] ?? ''}`.toUpperCase()
        : empleado.username.slice(0, 2).toUpperCase();
    const avatarBg = ROLE_AVATAR[empleado.role] ?? 'bg-slate-500';

    return (
        <div className="max-w-lg mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Banner */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className="pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-30" style={{ background: acento2 }} />

                {/* Back link — only show for admins since professors land here from their session */}
                {isAdmin && (
                    <Link href="/empleados" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs font-semibold mb-4 transition relative">
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                        Empleados
                    </Link>
                )}

                <div className="relative flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${avatarBg}`}>
                        <span className="text-white font-bold text-xl tracking-wide">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{ROLE_LABEL[empleado.role] ?? empleado.role}</p>
                        <h1 className="text-white font-bold text-xl leading-tight truncate">{displayName}</h1>
                        {empleado.dni && (
                            <p className="text-slate-500 text-xs mt-0.5">DNI {empleado.dni.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')}</p>
                        )}
                    </div>
                    {isAdmin && (
                        <Link
                            href={`/alumnos/${id}/plan`}
                            style={{ backgroundColor: acento }}
                            className="shrink-0 px-3 py-2 text-white text-xs font-bold rounded-xl hover:opacity-80 transition-opacity shadow-sm"
                        >
                            {planEj ? 'Editar plan' : 'Asignar plan'}
                        </Link>
                    )}
                </div>
            </div>

            {/* Plan section */}
            {loadingPlan && (
                <div className="flex justify-center py-12">
                    <div className="border-t-2 border-r-2 rounded-full w-8 h-8 animate-spin" style={{ borderTopColor: acento, borderRightColor: acento }} />
                </div>
            )}

            {!loadingPlan && !planEj && (
                <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm p-10 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    </div>
                    <p className="text-slate-600 font-semibold mb-1">Sin plan asignado</p>
                    <p className="text-slate-400 text-sm">
                        {isAdmin
                            ? 'Tocá "Asignar plan" para crear un plan de entrenamiento.'
                            : 'Todavía no tenés un plan de entrenamiento asignado.'}
                    </p>
                </div>
            )}

            {!loadingPlan && planEj && (() => {
                const totalSem = planEj.totalSemanas || 5;
                const dia = planEj.dias[selectedDia];
                const totalSesiones = totalSem * planEj.dias.length;

                const comboIdx: Record<string, number> = {};
                let nextCombo = 0;
                (dia?.ejercicios ?? []).forEach((e: EjercicioAsignado) => {
                    if (e.grupoCombo && comboIdx[e.grupoCombo] === undefined) {
                        comboIdx[e.grupoCombo] = nextCombo++;
                    }
                });

                return (
                    <div className="space-y-3">

                        {/* Plan header */}
                        <div className="bg-[#111] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                {planEj.categoria && <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{planEj.categoria}</p>}
                                <h2 className="text-white font-bold text-base truncate">{planEj.nombre}</h2>
                                <p className="text-slate-600 text-xs mt-0.5">{totalSesiones} sesiones · {totalSem} semanas · {planEj.dias.length} días/sem</p>
                            </div>
                            <div className="shrink-0 text-center rounded-xl px-3 py-2" style={{ background: `${acento2}25` }}>
                                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: acento2 }}>Semana</p>
                                <p className="font-bold text-xl leading-none text-white">{selectedSemana}</p>
                                <p className="text-xs" style={{ color: acento2 }}>de {totalSem}</p>
                            </div>
                        </div>

                        {/* Week selector */}
                        <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm p-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Semana</p>
                            <div className="flex gap-1.5">
                                {Array.from({ length: totalSem }, (_, i) => i + 1).map(sem => (
                                    <button
                                        key={sem}
                                        onClick={() => setSelectedSemana(sem)}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            selectedSemana === sem
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        {sem}
                                    </button>
                                ))}
                            </div>
                            {selectedSemana === 5 && (
                                <p className="text-center text-xs text-slate-400 mt-2 font-medium">Semana de descarga</p>
                            )}
                        </div>

                        {/* Day selector */}
                        <div className="flex gap-1.5">
                            {planEj.dias.map((d, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setSelectedDia(i); setExpandedEj(null); }}
                                    className={`relative flex-1 h-14 flex flex-col items-center justify-center rounded-2xl transition-all border overflow-hidden ${
                                        selectedDia === i
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                            : 'bg-white text-slate-500 border-black/[0.08] hover:border-black/20'
                                    }`}
                                >
                                    <span className="text-sm font-bold leading-none">{`Día ${i + 1}`}</span>
                                    {d.titulo && (
                                        <span className="text-[10px] leading-none mt-0.5 opacity-60 truncate max-w-[90%]">{d.titulo}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Bloque de activación */}
                        {dia?.bloqueActivacion && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                                <p className="text-xs font-bold text-amber-700 mb-1">Bloque de activación</p>
                                <p className="text-sm text-amber-800 leading-snug">{dia.bloqueActivacion}</p>
                            </div>
                        )}

                        {/* Exercises */}
                        {dia && (
                            <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm overflow-hidden">
                                <div className="grid grid-cols-[1fr_96px_68px] border-b border-black/[0.07]">
                                    <div className="px-4 py-2.5">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ejercicio</p>
                                    </div>
                                    <div className="px-2 py-2.5 text-center border-l border-black/[0.06]">
                                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Sem {selectedSemana}</p>
                                    </div>
                                    <div className="px-2 py-2.5 text-center border-l border-black/[0.06]">
                                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: acento }}>Mis KG</p>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {dia.ejercicios.length === 0 && (
                                        <p className="text-slate-400 text-sm text-center py-8">Sin ejercicios cargados.</p>
                                    )}
                                    {dia.ejercicios.map((ej, eIdx) => {
                                        const semVal = getSemanaField(ej, selectedSemana);
                                        const isExpanded = expandedEj === eIdx;
                                        const ci = ej.grupoCombo ? (comboIdx[ej.grupoCombo] ?? -1) : -1;
                                        const combo = ci >= 0 ? COMBO_PALETTE[ci % COMBO_PALETTE.length] : null;
                                        const prevEj = dia.ejercicios[eIdx - 1];
                                        const isFirstInCombo = combo && (!prevEj?.grupoCombo || prevEj.grupoCombo !== ej.grupoCombo);
                                        const kgVal = (ej[`kgAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || '';
                                        const obsVal = (ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || '';

                                        return (
                                            <div key={eIdx} style={combo ? { backgroundColor: combo.bg } : undefined}>
                                                <button
                                                    onClick={() => setExpandedEj(isExpanded ? null : eIdx)}
                                                    className="w-full grid grid-cols-[1fr_96px_68px] text-left hover:bg-slate-50 transition-colors active:bg-slate-100"
                                                >
                                                    <div className="px-4 py-3 flex items-center gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            {isFirstInCombo && combo && (
                                                                <div className="flex items-center gap-1 mb-0.5">
                                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: combo.dotColor }} />
                                                                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: combo.labelColor }}>Combinado</span>
                                                                </div>
                                                            )}
                                                            <p className="text-sm font-semibold text-slate-800 leading-tight">{ej.nombre}</p>
                                                            {ej.kg && ej.kg !== '-' && (
                                                                <p className="text-sm font-bold text-red-500 mt-0.5">{ej.kg} kg</p>
                                                            )}
                                                            {obsVal && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{obsVal}</p>}
                                                        </div>
                                                        <IconChevron className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    <div className="px-2 py-3 border-l border-black/[0.06] flex items-center justify-center">
                                                        <span className={`text-xs font-bold text-center leading-tight ${semVal ? 'text-slate-800' : 'text-slate-300'}`}>
                                                            {semVal || '—'}
                                                        </span>
                                                    </div>
                                                    <div className="px-2 py-3 border-l border-black/[0.06] flex items-center justify-center">
                                                        <span className={`text-sm font-bold ${kgVal ? '' : 'text-slate-200'}`} style={kgVal ? { color: acento } : undefined}>
                                                            {kgVal || '—'}
                                                        </span>
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-black/[0.06] space-y-3">
                                                        {ej.notas && <p className="text-xs text-slate-500 italic">{ej.notas}</p>}
                                                        <div className="flex flex-col gap-2">
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mis KG</label>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    value={kgVal}
                                                                    onChange={e => updateEj(eIdx, `kgAlumno${selectedSemana}`, e.target.value)}
                                                                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Observaciones</label>
                                                                <input
                                                                    type="text"
                                                                    value={obsVal}
                                                                    onChange={e => updateEj(eIdx, `observacionesAlumno${selectedSemana}`, e.target.value)}
                                                                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSaveEj(eIdx)}
                                                            disabled={savingEj === eIdx}
                                                            className="w-full py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-60 bg-slate-900 text-white hover:bg-slate-700"
                                                        >
                                                            {savingEj === eIdx ? 'Guardando...' : 'Guardar'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
