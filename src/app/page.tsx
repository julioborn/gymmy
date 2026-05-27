'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { swalBase, swalNotify } from '@/utils/swalConfig';

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

function capitalize(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function fmt(n: number): string {
    return n.toLocaleString('es-AR');
}

function fmtDate(): string {
    return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

type Tarifa = { dias: number; valor: number };

type DashboardData = {
    totalAlumnos: number;
    pagados: number;
    porcentajePagados: number;
    planesVenciendo: { _id: string; nombre: string; apellido: string; diasRestantes: number }[];
    horaPico: string | null;
    asistenciasHoy: number;
    ingresosCuotas: number;
    ingresosExtra: number;
    gastosMes: number;
    balance: number;
    mes: string;
};

const NAV_CARDS = [
    {
        href: '/alumnos',
        label: 'Lista de Alumnos',
        desc: 'Ver y gestionar alumnos',
        bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
        iconCls: 'text-slate-500',
        role: null as string | null,
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
        ),
    },
    {
        href: '/alumnos/nuevo',
        label: 'Registrar Alumno',
        desc: 'Añadir nuevo alumno',
        bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100',
        iconCls: 'text-emerald-600',
        role: null as string | null,
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
        ),
    },
    {
        href: '/alumnos/finanzas',
        label: 'Finanzas',
        desc: 'Control de ingresos',
        bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100',
        iconCls: 'text-amber-600',
        role: 'dueño' as string | null,
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        ),
    },
    {
        href: '/alumnos/estadisticas',
        label: 'Estadísticas',
        desc: 'Métricas del gimnasio',
        bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100',
        iconCls: 'text-blue-600',
        role: 'dueño' as string | null,
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
        ),
    },
];

function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="h-3 w-24 bg-slate-200 rounded mb-4" />
            <div className="h-8 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-2 w-full bg-slate-100 rounded" />
        </div>
    );
}

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargo, setRecargo] = useState<number | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
        if (session?.user?.role === 'registro') {
            router.push('/alumnos/dni');
        }
    }, [session, status, router]);

    useEffect(() => {
        if (session && session.user?.role !== 'registro' && session.user?.role !== 'alumno') {
            fetch('/api/dashboard')
                .then(r => r.json())
                .then(d => { if (d.ok) setData(d); })
                .catch(() => { })
                .finally(() => setLoading(false));
        }
    }, [session]);

    useEffect(() => {
        if (!session || session.user?.role === 'alumno') return;
        fetch('/api/tarifas')
            .then(r => r.json())
            .then(d => {
                setTarifas(d.tarifas || []);
                if (d.recargo != null) setRecargo(d.recargo);
            })
            .catch(() => { });
        fetch('/api/recargo')
            .then(r => r.json())
            .then(d => { if (d.monto != null) setRecargo(d.monto); })
            .catch(() => { });
    }, [session]);

    const handleConfiguracionTarifas = async () => {
        if (tarifas.length === 0) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontraron cuotas. Por favor, recarga la página.' });
            return;
        }
        const tarifaInputs = tarifas.map(t => `
            <div>
                <label class="swal-form-label">Días ${t.dias} por semana</label>
                <input type="number" id="tarifa-${t.dias}" class="swal2-input" value="${t.valor}">
            </div>
        `).join('');
        const result = await Swal.fire({
            ...swalBase,
            title: 'Configurar Cuotas',
            html: `<div class="swal-form-body">${tarifaInputs}</div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => tarifas.map(t => ({
                ...t,
                valor: Number((document.getElementById(`tarifa-${t.dias}`) as HTMLInputElement).value),
            })),
        });
        const nuevasTarifas = result.value as Tarifa[] | undefined;
        if (nuevasTarifas) {
            try {
                const res = await fetch('/api/tarifas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevasTarifas),
                });
                if (res.ok) {
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Cuotas actualizadas' });
                    setTarifas(nuevasTarifas);
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las cuotas' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar las cuotas' });
            }
        }
    };

    const handleConfiguracionRecargos = async () => {
        if (recargo === null) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontró el valor del recargo. Por favor, recarga la página.' });
            return;
        }
        const { value: nuevoMonto } = await Swal.fire({
            ...swalBase,
            title: 'Configurar Recargo',
            input: 'number',
            inputLabel: 'Monto del recargo ($)',
            inputValue: recargo,
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'El monto debe ser un número mayor a 0';
                return null;
            },
        });
        if (nuevoMonto && Number(nuevoMonto) !== recargo) {
            try {
                const res = await fetch('/api/recargo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monto: Number(nuevoMonto) }),
                });
                if (res.ok) {
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargo actualizado' });
                    setRecargo(Number(nuevoMonto));
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el recargo' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar el recargo' });
            }
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const esDueño = session.user?.role === 'dueño';
    const visibleCards = NAV_CARDS.filter(c => !c.role || c.role === session.user?.role);

    const pagoColor = !data ? '' : data.porcentajePagados >= 80 ? 'text-emerald-600' : data.porcentajePagados >= 50 ? 'text-amber-600' : 'text-red-600';
    const pagoBarColor = !data ? 'bg-slate-200' : data.porcentajePagados >= 80 ? 'bg-emerald-500' : data.porcentajePagados >= 50 ? 'bg-amber-400' : 'bg-red-500';
    const balanceColor = !data ? '' : data.balance >= 0 ? 'text-emerald-600' : 'text-red-600';

    return (
        <div className="w-full max-w-4xl mx-auto">

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl px-6 py-5">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-0.5">
                    {getGreeting()} · {fmtDate()}
                </p>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                    {capitalize(session.user?.username ?? 'Usuario')}
                </h1>
            </div>

            {/* Body */}
            <div className="bg-white rounded-b-2xl shadow-xl p-4 lg:p-6 space-y-6">

                {/* KPI Cards */}
                {loading ? (
                    <div className={`grid grid-cols-2 ${esDueño ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
                        {Array.from({ length: esDueño ? 4 : 3 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : data && (
                    <div className={`grid grid-cols-2 ${esDueño ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>

                        {/* Pagaron este mes */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pagaron este mes</p>
                            <div className="flex items-end gap-1.5 mb-3">
                                <span className={`text-3xl font-bold ${pagoColor}`}>{data.pagados}</span>
                                <span className="text-sm text-slate-400 mb-1">/ {data.totalAlumnos}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5">
                                <div
                                    className={`h-1.5 rounded-full transition-all duration-700 ${pagoBarColor}`}
                                    style={{ width: `${data.porcentajePagados}%` }}
                                />
                            </div>
                            <p className={`text-xs font-bold ${pagoColor}`}>{data.porcentajePagados}% al día</p>
                        </div>

                        {/* Asistencias hoy */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Asistencias hoy</p>
                            <div className="flex items-end gap-1.5 mb-3">
                                <span className="text-3xl font-bold text-slate-800">{data.asistenciasHoy}</span>
                                <span className="text-sm text-slate-400 mb-1">alumnos</span>
                            </div>
                            {data.horaPico ? (
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    <p className="text-xs text-slate-500">
                                        Hora pico <span className="font-bold text-blue-600">{data.horaPico}</span>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400">Sin datos este mes</p>
                            )}
                        </div>

                        {/* Planes por vencer */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Planes por vencer</p>
                            <div className="flex items-end gap-1.5 mb-3">
                                <span className={`text-3xl font-bold ${data.planesVenciendo.length > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                    {data.planesVenciendo.length}
                                </span>
                                <span className="text-sm text-slate-400 mb-1">alumnos</span>
                            </div>
                            {data.planesVenciendo.length === 0 ? (
                                <p className="text-xs text-emerald-600 font-semibold">Todo en orden ✓</p>
                            ) : (
                                <p className="text-xs text-amber-600 font-semibold">≤ 5 clases restantes</p>
                            )}
                        </div>

                        {/* Balance del mes (solo dueño) */}
                        {esDueño && (
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                    Balance · <span className="normal-case">{capitalize(data.mes)}</span>
                                </p>
                                <div className="flex items-end gap-1 mb-3">
                                    <span className={`text-2xl font-bold ${balanceColor}`}>
                                        ${fmt(data.balance)}
                                    </span>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs text-slate-500">
                                        <span className="text-emerald-600 font-semibold">+${fmt(data.ingresosCuotas + data.ingresosExtra)}</span> ingresos
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        <span className="text-red-500 font-semibold">−${fmt(data.gastosMes)}</span> gastos
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Alerta: planes por vencer */}
                {data && data.planesVenciendo.length > 0 && (
                    <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Planes por vencer</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.planesVenciendo.map(a => (
                                <Link
                                    key={a._id}
                                    href={`/alumnos/${a._id}/historial`}
                                    className="flex items-center gap-2 bg-white border border-amber-200 hover:border-amber-400 rounded-xl px-3 py-2 transition-all group"
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${a.diasRestantes === 0 ? 'bg-red-500' : 'bg-amber-400'}`}>
                                        {a.diasRestantes}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                                        {a.apellido}, {a.nombre}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Separador */}
                <div className="border-t border-slate-100" />

                {/* Navigation shortcuts */}
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Accesos rápidos</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {visibleCards.map((card) => (
                            <Link
                                key={card.href}
                                href={card.href}
                                className={`${card.bg} border p-4 rounded-2xl flex flex-col gap-2.5 transition-all duration-200 shadow-sm active:scale-[0.97]`}
                            >
                                <div className={card.iconCls}>{card.icon}</div>
                                <div>
                                    <p className="font-bold text-sm leading-tight text-slate-800">{card.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Configuración */}
                <div className="border-t border-slate-100" />
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Configuración</p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleConfiguracionTarifas}
                            className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-2xl transition-all duration-200 shadow-sm active:scale-[0.97]"
                        >
                            <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                            </svg>
                            <div className="text-left">
                                <p className="font-bold text-sm text-slate-800">Cuotas</p>
                                <p className="text-xs text-slate-500">Precios por días/semana</p>
                            </div>
                        </button>
                        <button
                            onClick={handleConfiguracionRecargos}
                            className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-2xl transition-all duration-200 shadow-sm active:scale-[0.97]"
                        >
                            <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <div className="text-left">
                                <p className="font-bold text-sm text-slate-800">Recargo</p>
                                <p className="text-xs text-slate-500">Monto por mora</p>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
