'use client';

import { useSession } from 'next-auth/react';
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
        label: 'Alumnos',
        desc: 'Ver y gestionar alumnos',
        iconBg: 'bg-slate-700',
        role: null as string | null,
        icon: (
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
        ),
    },
    {
        href: '/alumnos/nuevo',
        label: 'Registrar',
        desc: 'Añadir nuevo alumno',
        iconBg: 'bg-emerald-500',
        role: null as string | null,
        icon: (
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
        ),
    },
    {
        href: '/alumnos/asistencia',
        label: 'Asistencia',
        desc: 'Registrar asistencia',
        iconBg: 'bg-violet-500',
        role: null as string | null,
        icon: (
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        ),
    },
    {
        href: '/alumnos/finanzas',
        label: 'Finanzas',
        desc: 'Control de ingresos',
        iconBg: 'bg-amber-400',
        role: 'dueño' as string | null,
        icon: (
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        ),
    },
    {
        href: '/alumnos/estadisticas',
        label: 'Estadísticas',
        desc: 'Métricas del gimnasio',
        iconBg: 'bg-blue-500',
        role: 'dueño' as string | null,
        icon: (
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
        ),
    },
];

function SkeletonCard() {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 animate-pulse shadow-sm">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-slate-200 mb-2 md:mb-3" />
            <div className="h-5 md:h-7 w-12 md:w-16 bg-slate-200 rounded mb-2" />
            <div className="h-1.5 w-full bg-slate-100 rounded mb-1.5" />
            <div className="h-2 w-14 md:w-20 bg-slate-100 rounded" />
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
        if (status === 'unauthenticated') router.push('/login');
        if (session?.user?.role === 'registro') router.push('/alumnos/dni');
        if (session?.user?.role === 'alumno') router.push('/mi-cuenta');
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
            .then(d => { setTarifas(d.tarifas || []); if (d.recargo != null) setRecargo(d.recargo); })
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
                const res = await fetch('/api/tarifas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevasTarifas) });
                if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Cuotas actualizadas' }); setTarifas(nuevasTarifas); }
                else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las cuotas' });
            } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar las cuotas' }); }
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
            inputValidator: (value) => (!value || Number(value) <= 0) ? 'El monto debe ser un número mayor a 0' : null,
        });
        if (nuevoMonto && Number(nuevoMonto) !== recargo) {
            try {
                const res = await fetch('/api/recargo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monto: Number(nuevoMonto) }) });
                if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargo actualizado' }); setRecargo(Number(nuevoMonto)); }
                else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el recargo' });
            } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar el recargo' }); }
        }
    };

    if (!session) return null;
    if (session.user?.role === 'alumno') return null;

    const userRole = session.user?.role ?? '';
    const esDueño = userRole === 'dueño' || userRole === 'admin';
    const esProfesor = userRole === 'profesor';
    const visibleCards = NAV_CARDS.filter(c => {
        if (!c.role) return true;
        if (c.role === userRole) return true;
        if (c.role === 'dueño' && userRole === 'admin') return true;
        return false;
    });

    const pagoColor = !data ? '' : data.porcentajePagados >= 80 ? 'text-emerald-600' : data.porcentajePagados >= 50 ? 'text-amber-600' : 'text-red-600';
    const pagoBarColor = !data ? 'bg-slate-200' : data.porcentajePagados >= 80 ? 'bg-emerald-500' : data.porcentajePagados >= 50 ? 'bg-amber-400' : 'bg-red-500';
    const balanceColor = !data ? '' : data.balance >= 0 ? 'text-emerald-600' : 'text-red-600';
    const balanceBg = !data ? 'bg-slate-400' : data.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500';

    return (
        <div className="max-w-5xl mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Banner */}
            <div className="bg-slate-900 rounded-3xl px-6 pt-6 pb-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest mb-0.5">
                            {getGreeting()}
                        </p>
                        <h1 className="text-2xl font-bold text-white truncate">
                            {capitalize(session.user?.username ?? 'Usuario')}
                        </h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/50 ml-3 shrink-0">
                        <span className="text-xl font-bold text-white">
                            {(session.user?.username ?? 'U')[0].toUpperCase()}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full capitalize">
                        {session.user?.role}
                    </span>
                    <span className="text-slate-600 text-[11px]">·</span>
                    <span className="text-slate-400 text-[11px] capitalize">{fmtDate()}</span>
                </div>
            </div>

            {/* KPI Cards */}
            {loading ? (
                <div className={`grid ${esDueño ? 'grid-cols-2 md:grid-cols-4' : esProfesor ? 'grid-cols-2' : 'grid-cols-3'} gap-2 md:gap-3`}>
                    {Array.from({ length: esDueño ? 4 : esProfesor ? 2 : 3 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : data && (
                <div className={`grid ${esDueño ? 'grid-cols-2 md:grid-cols-4' : esProfesor ? 'grid-cols-2' : 'grid-cols-3'} gap-2 md:gap-3`}>

                    {/* Pagaron este mes — oculto para profesor */}
                    {!esProfesor && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 shadow-sm">
                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-emerald-500 flex items-center justify-center mb-2 md:mb-3 shadow-sm shadow-emerald-200">
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <div className="flex items-baseline gap-1 mb-1.5 md:mb-2">
                                <span className={`text-xl md:text-3xl font-bold ${pagoColor}`}>{data.pagados}</span>
                                <span className="text-[10px] md:text-xs text-slate-400 font-medium">/ {data.totalAlumnos}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1 mb-1.5 md:mb-2">
                                <div className={`h-1 rounded-full transition-all duration-700 ${pagoBarColor}`} style={{ width: `${data.porcentajePagados}%` }} />
                            </div>
                            <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">Pagaron</p>
                        </div>
                    )}

                    {/* Asistencias hoy */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 shadow-sm">
                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-blue-500 flex items-center justify-center mb-2 md:mb-3 shadow-sm shadow-blue-200">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        </div>
                        <div className="flex items-baseline gap-1 mb-1.5 md:mb-2">
                            <span className="text-xl md:text-3xl font-bold text-slate-800">{data.asistenciasHoy}</span>
                        </div>
                        {/* {data.horaPico ? (
                            <p className="text-[10px] md:text-[11px] text-slate-500 mb-1">Pico: <span className="font-bold text-blue-600">{data.horaPico}</span></p>
                        ) : (
                            <p className="text-[10px] md:text-[11px] text-slate-400 mb-1">Sin datos</p>
                        )} */}
                        <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">Asistencias</p>
                    </div>

                    {/* Planes por vencer */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 shadow-sm">
                        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-3 shadow-sm ${data.planesVenciendo.length > 0 ? 'bg-amber-400 shadow-amber-200' : 'bg-emerald-500 shadow-emerald-200'}`}>
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <div className="flex items-baseline gap-1 mb-1.5 md:mb-2">
                            <span className={`text-xl md:text-3xl font-bold ${data.planesVenciendo.length > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>{data.planesVenciendo.length}</span>
                        </div>
                        {/* <p className={`text-[10px] md:text-[11px] font-semibold mb-1 leading-tight ${data.planesVenciendo.length === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {data.planesVenciendo.length === 0 ? 'Al día ✓' : '≤ 5 clases'}
                        </p> */}
                        <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">Planes</p>
                    </div>

                    {/* Balance del mes (solo dueño) */}
                    {esDueño && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 shadow-sm ${balanceBg}`}>
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <div className="flex items-baseline gap-0.5 mb-1">
                                <span className={`text-2xl font-bold ${balanceColor}`}>${fmt(data.balance)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-1">
                                <span className="text-emerald-600 font-bold">+${fmt(data.ingresosCuotas + data.ingresosExtra)}</span>
                                {' · '}
                                <span className="text-red-500 font-bold">−${fmt(data.gastosMes)}</span>
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Balance · {capitalize(data.mes)}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Alerta: planes por vencer */}
            {data && data.planesVenciendo.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Planes por vencer</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.planesVenciendo.map(a => (
                            <Link key={a._id} href={`/alumnos/${a._id}/historial`} className="flex items-center gap-2 bg-white border border-amber-200 hover:border-amber-400 rounded-xl px-3 py-2 transition-all group">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${a.diasRestantes === 0 ? 'bg-red-500' : 'bg-amber-400'}`}>
                                    {a.diasRestantes}
                                </div>
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{a.apellido}, {a.nombre}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Accesos rápidos + Configuración — side by side on desktop, same height */}
            <div className="flex flex-col md:flex-row md:items-stretch gap-4">

                {/* Accesos rápidos */}
                <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">Accesos rápidos</p>
                    {/* Mobile: compact horizontal cards (2 col). Desktop: icon-top cards (4 col) */}
                    <div className={`grid gap-2 md:gap-3 ${visibleCards.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                        {visibleCards.map((card) => (
                            <Link
                                key={card.href}
                                href={card.href}
                                className="bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-sm active:scale-[0.97] transition-transform
                                    flex items-center gap-2.5 p-3
                                    md:flex-col md:items-start md:gap-3 md:p-4"
                            >
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                                    {card.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-xs md:text-sm leading-tight text-slate-800">{card.label}</p>
                                    <p className="hidden md:block text-xs text-slate-500 mt-0.5">{card.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Configuración — solo dueño/admin */}
                {!esProfesor && (
                    <div className="md:w-64 shrink-0 flex flex-col">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">Configuración</p>
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                            <button onClick={handleConfiguracionTarifas} className="flex-1 w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                                    </svg>
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-sm text-slate-800">Cuotas</p>
                                    <p className="text-xs text-slate-500">Precios por días/semana</p>
                                </div>
                                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
                                </svg>
                            </button>
                            <div className="border-t border-slate-100" />
                            <button onClick={handleConfiguracionRecargos} className="flex-1 w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-sm text-slate-800">Recargo</p>
                                    <p className="text-xs text-slate-500">Monto por mora</p>
                                </div>
                                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
}
