'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaymentEvents } from '@/hooks/usePaymentEvents';
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
    asistenciasHoyFranja: { manana: number; siesta: number; tarde: number };
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
        href: '/empleados',
        label: 'Empleados',
        desc: 'Gestionar equipo',
        iconBg: 'bg-slate-800',
        role: 'dueño' as string | null,
        icon: (
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
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
        iconBg: 'bg-slate-800',
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
        <div className="bg-white border border-black/[0.07] rounded-2xl p-4 animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="w-9 h-9 rounded-xl bg-slate-100 mb-3" />
            <div className="h-7 w-16 bg-slate-100 rounded mb-2" />
            <div className="h-2.5 w-20 bg-slate-100 rounded" />
        </div>
    );
}

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargoDiez, setRecargoDiez] = useState<number>(0);
    const [recargoMes, setRecargoMes] = useState<number>(0);
    const [aliasGimnasio, setAliasGimnasio] = useState<string>('');
    const [gimnasioNombre, setGimnasioNombre] = useState<string>('');
    const [showBalance, setShowBalance] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem('gymmy_showBalance') !== 'false';
    });
    const toggleBalance = () => setShowBalance(v => {
        const next = !v;
        localStorage.setItem('gymmy_showBalance', String(next));
        return next;
    });

    useEffect(() => {
        if (session?.user?.role === 'registro') router.push('/alumnos/dni');
        if (session?.user?.role === 'alumno') router.push('/mi-cuenta');
    }, [session, router]);

    const fetchDashboard = () => {
        if (!session || session.user?.role === 'registro' || session.user?.role === 'alumno') return;
        fetch('/api/dashboard')
            .then(r => r.json())
            .then(d => { if (d.ok) setData(d); })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchDashboard();
    }, [session]);

    usePaymentEvents(fetchDashboard);

    useEffect(() => {
        if (!session || session.user?.role === 'alumno') return;
        fetch('/api/tarifas')
            .then(r => r.json())
            .then(d => { setTarifas(d.tarifas || []); })
            .catch(() => { });
        fetch('/api/recargo')
            .then(r => r.json())
            .then(d => { setRecargoDiez(d.montoDiez ?? 0); setRecargoMes(d.montoMes ?? 0); })
            .catch(() => { });
        fetch('/api/gimnasio/alias')
            .then(r => r.json())
            .then(d => { setAliasGimnasio(d.alias ?? ''); setGimnasioNombre(d.nombre ?? ''); })
            .catch(() => { });
    }, [session]);

    const handleConfiguracionTarifas = async () => {
        if (tarifas.length === 0) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontraron cuotas. Por favor, recargá la página.' });
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
        const { value: result } = await Swal.fire({
            ...swalBase,
            title: 'Configurar Recargos',
            html: `
                <div class="swal-form-body">
                    <div style="margin-bottom:1rem;">
                        <label class="swal-form-label">Recargo pasando el día 10 del mes ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-diez" class="swal2-input" value="${recargoDiez}" placeholder="0">
                    </div>
                    <div>
                        <label class="swal-form-label">Recargo pasando el mes completo ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-mes" class="swal2-input" value="${recargoMes}" placeholder="0">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const rawD = (document.getElementById('recargo-diez') as HTMLInputElement)?.value ?? '';
                const rawM = (document.getElementById('recargo-mes') as HTMLInputElement)?.value ?? '';
                const d = parseInt(rawD.replace(/\D/g, ''), 10) || 0;
                const m = parseInt(rawM.replace(/\D/g, ''), 10) || 0;
                return { montoDiez: d, montoMes: m };
            },
        });
        if (result) {
            try {
                const res = await fetch('/api/recargo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) });
                if (res.ok) { setRecargoDiez(result.montoDiez); setRecargoMes(result.montoMes); Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargos actualizados' }); }
                else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar los recargos' });
            } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar los recargos' }); }
        }
    };

    const handleConfiguracionAlias = async () => {
        const { value: nuevoAlias } = await Swal.fire({
            ...swalBase,
            title: 'Alias de pago',
            html: `<p style="font-size:13px;color:#64748b;margin-bottom:12px;">Ingresá el alias de tu cuenta de Mercado Pago para que los alumnos puedan transferirte.</p>`,
            input: 'text',
            inputPlaceholder: 'ejemplo.gimnasio.mp',
            inputValue: aliasGimnasio,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            inputValidator: (v) => !v?.trim() ? 'El alias no puede estar vacío' : null,
        });
        if (nuevoAlias && nuevoAlias.trim() !== aliasGimnasio) {
            try {
                const res = await fetch('/api/gimnasio/alias', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ alias: nuevoAlias.trim() }),
                });
                if (res.ok) { setAliasGimnasio(nuevoAlias.trim()); Swal.fire({ ...swalNotify, icon: 'success', title: 'Alias guardado' }); }
                else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo guardar el alias' });
            } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al guardar el alias' }); }
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

    const isSporttime = gimnasioNombre.toLowerCase().includes('sport');
    const pagoColor = !data ? '' : data.porcentajePagados >= 80 ? 'text-emerald-600' : data.porcentajePagados >= 50 ? 'text-amber-600' : 'text-red-600';
    const pagoBarColor = !data ? 'bg-slate-200' : data.porcentajePagados >= 80 ? 'bg-emerald-500' : data.porcentajePagados >= 50 ? 'bg-amber-400' : 'bg-red-500';
    const balanceColor = !data ? '' : data.balance >= 0 ? 'text-emerald-600' : 'text-red-600';
    const balanceBg = !data ? 'bg-slate-400' : data.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500';

    // Un único token de card aplicado a TODAS las stat cards — sin excepciones
    const card = 'bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)] p-4';
    const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';
    const num = 'text-3xl font-bold leading-none';
    const sub = 'text-xs text-slate-500 mt-1';
    const mesLabel = data ? capitalize(data.mes) : '';

    return (
        <div className="max-w-lg mx-auto pt-4 pb-16 px-4 space-y-5">

            {/* ── Banner ── */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className={`pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-25 ${isSporttime ? 'bg-[#d1e08b]' : 'bg-emerald-400'}`} />
                <div className="relative">
                    <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">{getGreeting()}</p>
                    <h1 className="text-xl font-bold text-white mt-0.5 truncate">
                        {(session.user as any)?.nombre
                            ? capitalize((session.user as any).nombre)
                            : capitalize(session.user?.username ?? 'Usuario')}
                    </h1>
                    <div className="flex items-center gap-2 mt-2.5">
                        <span className="bg-white/10 ring-1 ring-white/10 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize">
                            {session.user?.role}
                        </span>
                        <span className="text-slate-600 text-[10px]">·</span>
                        <span className="text-slate-500 text-[10px] capitalize">{fmtDate()}</span>
                    </div>
                </div>
            </div>

            {/* ── Accesos rápidos — círculos en fila horizontal ── */}
            <div>
                <p className={`${lbl} mb-4`}>Accesos rápidos</p>
                <div className="flex justify-around">
                    {visibleCards.map((card_nav) => (
                        <Link
                            key={card_nav.href}
                            href={card_nav.href}
                            className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center">
                                {card_nav.icon}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600 text-center">{card_nav.label}</span>
                        </Link>
                    ))}
                    {esProfesor && session.user?.id && (
                        <Link
                            href={`/empleados/${session.user.id}`}
                            className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center">
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600 text-center">Mi plan</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Stat cards ── */}
            {loading ? (
                <div className="space-y-3">
                    {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : data && (
                <div className="space-y-3">

                    {/* Balance del mes */}
                    {esDueño && (
                        <div className={card}>
                            <div className="flex items-center justify-between mb-2">
                                <p className={lbl}>Balance · {mesLabel}</p>
                                <button
                                    onClick={toggleBalance}
                                    className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                                    aria-label={showBalance ? 'Ocultar balance' : 'Mostrar balance'}
                                >
                                    {showBalance ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className={`${num} ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {showBalance ? `$${fmt(data.balance)}` : '$ ••••••'}
                            </p>
                            <p className={sub}>balance del mes</p>
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
                                <div>
                                    <p className="text-xs font-bold text-emerald-600">
                                        {showBalance ? `+$${fmt(data.ingresosCuotas + data.ingresosExtra)}` : '+$ ••••'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">ingresos</p>
                                </div>
                                <div className="w-px h-6 bg-slate-100" />
                                <div>
                                    <p className="text-xs font-bold text-red-500">
                                        {showBalance ? `−$${fmt(data.gastosMes)}` : '−$ ••••'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">egresos</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cuotas */}
                    {!esProfesor && (
                        <div className={card}>
                            <p className={`${lbl} mb-3`}>Cuotas · {mesLabel}</p>
                            <div className="flex items-stretch">
                                <div className="flex-1 text-center">
                                    <p className={`${num} text-emerald-600`}>{data.pagados}</p>
                                    <p className={`${sub} text-emerald-500`}>Pagaron</p>
                                </div>
                                <div className="w-px bg-slate-100 mx-3 self-stretch" />
                                <div className="flex-1 text-center">
                                    <p className={`${num} text-red-500`}>{data.totalAlumnos - data.pagados}</p>
                                    <p className={`${sub} text-red-400`}>Pendientes</p>
                                </div>
                                <div className="w-px bg-slate-100 mx-3 self-stretch" />
                                <div className="flex-1 text-center">
                                    <p className={`${num} text-slate-800`}>{data.totalAlumnos}</p>
                                    <p className={sub}>Total</p>
                                </div>
                            </div>
                            <div className="mt-3 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${pagoBarColor}`} style={{ width: `${data.porcentajePagados}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Asistencias hoy */}
                    <div className={card}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className={`${lbl} mb-1`}>Asistencias · Hoy</p>
                                {data.asistenciasHoy > 0 ? (
                                    <div className="flex gap-4 mt-2">
                                        {(data.asistenciasHoyFranja?.manana ?? 0) > 0 && (
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{data.asistenciasHoyFranja.manana}</p>
                                                <p className="text-[10px] text-slate-400">☀️ Mañana</p>
                                            </div>
                                        )}
                                        {(data.asistenciasHoyFranja?.siesta ?? 0) > 0 && (
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{data.asistenciasHoyFranja.siesta}</p>
                                                <p className="text-[10px] text-slate-400">🌤 Siesta</p>
                                            </div>
                                        )}
                                        {(data.asistenciasHoyFranja?.tarde ?? 0) > 0 && (
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{data.asistenciasHoyFranja.tarde}</p>
                                                <p className="text-[10px] text-slate-400">🌆 Tarde</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-1">Sin registros aún</p>
                                )}
                            </div>
                            <p className={`${num} text-slate-900 shrink-0`}>{data.asistenciasHoy}</p>
                        </div>
                    </div>

                    {/* Planes */}
                    <div className={card}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <p className={`${lbl} mb-1`}>Planes</p>
                                {data.planesVenciendo.length > 0 ? (
                                    <div className="mt-2 space-y-1.5">
                                        {data.planesVenciendo.slice(0, 3).map(a => (
                                            <Link key={a._id} href={`/alumnos/${a._id}/historial`} className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${a.diasRestantes === 0 ? 'bg-red-500' : 'bg-amber-400'}`}>
                                                    {a.diasRestantes}
                                                </span>
                                                <span className="text-xs text-slate-600 truncate">{a.apellido}, {a.nombre}</span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-1">Sin vencimientos</p>
                                )}
                            </div>
                            <p className={`${num} ${data.planesVenciendo.length > 0 ? 'text-amber-500' : 'text-slate-900'} shrink-0`}>
                                {data.planesVenciendo.length}
                            </p>
                        </div>
                    </div>

                </div>
            )}

            {/* ── Configuración ── */}
            {!esProfesor && (
                <div>
                    <p className={`${lbl} mb-3`}>Configuración</p>
                    <div className="bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)] overflow-hidden">
                        {[
                            {
                                label: 'Cuotas', sub: 'Precios por días/semana', onClick: handleConfiguracionTarifas,
                                icon: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>,
                            },
                            {
                                label: 'Recargo', sub: 'Día 10 y mes vencido', onClick: handleConfiguracionRecargos,
                                icon: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
                            },
                            {
                                label: 'Alias de pago', sub: aliasGimnasio || 'Sin configurar', onClick: handleConfiguracionAlias,
                                icon: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>,
                            },
                        ].map((item, idx, arr) => (
                            <div key={item.label}>
                                <button onClick={item.onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
                                    <div className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center shrink-0">
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-slate-800">{item.label}</p>
                                        <p className="text-xs text-slate-400 truncate">{item.sub}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
                                    </svg>
                                </button>
                                {idx < arr.length - 1 && <div className="border-t border-black/[0.04] mx-4" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
