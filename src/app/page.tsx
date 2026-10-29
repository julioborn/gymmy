'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaymentEvents } from '@/hooks/usePaymentEvents';
import { useAttendanceEvents, type AttendanceArrival } from '@/hooks/useAttendanceEvents';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { swalBase, swalNotify } from '@/utils/swalConfig';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import {
    Users, Briefcase, TrendingUp, BarChart3,
    Eye, EyeOff, ChevronRight, ChevronLeft, UserPlus,
    Banknote, AlertCircle, FileText, Link2,
    Sun, Moon, Sunset, Coffee, AlertTriangle,
    Activity, UserCheck, Clock, CheckCircle2,
} from 'lucide-react';

// ─── Utils ────────────────────────────────────────────────────────────────────
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── Magic UI: NumberTicker ────────────────────────────────────────────────────
function NumberTicker({ value, prefix = '' }: { value: number; prefix?: string }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, {
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
            onUpdate(v) { setDisplay(Math.floor(v)); },
        });
        return ctrl.stop;
    }, [value]);
    return <>{prefix}{display.toLocaleString('es-AR')}</>;
}

// ─── Magic UI: BlurFade ────────────────────────────────────────────────────────
function BlurFade({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, filter: 'blur(6px)', y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

// ─── Magic UI: AnimatedBar ────────────────────────────────────────────────────
function AnimatedBar({ pct, color }: { pct: number; color: string }) {
    return (
        <div className="w-full bg-white/[0.1] rounded-full h-1 overflow-hidden">
            <motion.div
                className={cn('h-full rounded-full', color)}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
        </div>
    );
}

// ─── Magic UI: ArrivalToastStack ───────────────────────────────────────────────
type ArrivalToast = { key: string; nombre: string; apellido: string; actividad: string; tipo: 'alumno' | 'depaso' };

function ArrivalToastStack({ toasts }: { toasts: ArrivalToast[] }) {
    return (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 w-[320px] pointer-events-none">
            <AnimatePresence initial={false}>
                {toasts.map(t => (
                    <motion.div
                        key={t.key}
                        layout
                        initial={{ opacity: 0, x: 80, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.25 } }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className={cn(
                            'relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl',
                            t.tipo === 'depaso' ? 'bg-teal-400/10 border-teal-400/25 shadow-teal-400/10' : 'bg-lime-400/10 border-lime-400/25 shadow-lime-400/10',
                        )}
                    >
                        <motion.div
                            className={cn('absolute inset-0', t.tipo === 'depaso' ? 'bg-teal-400/15' : 'bg-lime-400/15')}
                            initial={{ opacity: 0.9 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                        <div className={cn(
                            'relative w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                            t.tipo === 'depaso' ? 'bg-teal-400/20 text-teal-300' : 'bg-lime-400/20 text-lime-300',
                        )}>
                            {t.nombre?.[0]}{t.apellido?.[0]}
                        </div>
                        <div className="relative flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{t.nombre} {t.apellido}</p>
                            <p className={cn('text-[11px] font-medium', t.tipo === 'depaso' ? 'text-teal-300/80' : 'text-lime-300/80')}>
                                Llegó · {t.actividad}
                            </p>
                        </div>
                        <CheckCircle2 size={18} className={cn('relative shrink-0', t.tipo === 'depaso' ? 'text-teal-400' : 'text-lime-400')} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}
function capitalize(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}
function fmt(n: number): string { return n.toLocaleString('es-AR'); }
function fmtDate(): string {
    return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Tarifa = { dias: number; valor: number };
type AlumnoAsistencia = { nombre: string; apellido: string; actividad: string; hora: string; id: string; pagado: boolean };
type DePasoEntry = { nombre: string; apellido: string; actividad: string; hora: string; id: string };
type DiaData = { key: string; labelDay: string; labelNum: number; fechaLarga: string; alumnos: AlumnoAsistencia[]; depaso: DePasoEntry[] };

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

// ─── Nav cards ────────────────────────────────────────────────────────────────
const NAV_CARDS = [
    {
        href: '/alumnos', label: 'Alumnos', role: null as string | null,
        icon: <Users size={18} className="text-white" />,
    },
    {
        href: '/empleados', label: 'Empleados', role: 'dueño' as string | null,
        icon: <Briefcase size={18} className="text-white" />,
    },
    {
        href: '/alumnos/finanzas', label: 'Finanzas', role: 'dueño' as string | null,
        icon: <TrendingUp size={18} className="text-white" />,
    },
    {
        href: '/alumnos/estadisticas', label: 'Estadísticas', role: 'dueño' as string | null,
        icon: <BarChart3 size={18} className="text-white" />,
    },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="bg-white/[0.1] border border-white/[0.15] rounded-2xl p-4 animate-pulse h-[160px]">
            <div className="w-24 h-2 bg-white/[0.12] rounded mb-4" />
            <div className="w-14 h-8 bg-white/[0.12] rounded mb-2" />
            <div className="w-20 h-2 bg-white/[0.12] rounded" />
        </div>
    );
}

// ─── Stat Card wrapper ────────────────────────────────────────────────────────
function StatCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('bg-white/[0.15] border border-white/[0.22] rounded-2xl p-4 flex flex-col h-[140px] sm:h-[160px] overflow-hidden', className)}>
            {children}
        </div>
    );
}

function StatLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-bold text-white/55 uppercase tracking-[0.12em] mb-2">{children}</p>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargoDiez, setRecargoDiez] = useState<number>(0);
    const [recargoMes, setRecargoMes] = useState<number>(0);
    const [aliasGimnasio, setAliasGimnasio] = useState<string>('');
    const [gimnasioNombre, setGimnasioNombre] = useState<string>('');
    const [actividadesRecepcion, setActividadesRecepcion] = useState<string[]>(['Musculación']);
    const [diasData, setDiasData] = useState<DiaData[]>([]);
    const [diaExpandido, setDiaExpandido] = useState<string | null>(null);
    const [activeSlot, setActiveSlot] = useState<string | null>(null);
    const [listPage, setListPage] = useState(0);
    const [loadingHoy, setLoadingHoy] = useState(false);
    const [horaArg, setHoraArg] = useState('');
    const [savingActividades, setSavingActividades] = useState(false);
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

    useEffect(() => { fetchDashboard(); }, [session]);
    usePaymentEvents(fetchDashboard);

    const fetchAsistencias = () => {
        if (!session || session.user?.role !== 'recepcion') return;
        setLoadingHoy(true);
        const ARG = -3 * 60 * 60 * 1000;
        const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
        Promise.all([
            fetch('/api/alumnos').then(r => r.json()),
            fetch('/api/alumnos-de-paso').then(r => r.json()),
        ]).then(([alumnosData, depasosData]) => {
            const nowArg = new Date(Date.now() + ARG);
            const todayKey = `${nowArg.getUTCFullYear()}-${String(nowArg.getUTCMonth() + 1).padStart(2, '0')}-${String(nowArg.getUTCDate()).padStart(2, '0')}`;
            const dow = nowArg.getUTCDay();
            const daysToMon = dow === 0 ? 6 : dow - 1;
            const monday = new Date(Date.UTC(nowArg.getUTCFullYear(), nowArg.getUTCMonth(), nowArg.getUTCDate() - daysToMon));
            const WEEK_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];
            const dias: DiaData[] = [];
            for (let i = 0; i < 5; i++) {
                const d = new Date(monday.getTime() + i * 86400000);
                const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                const fechaLarga = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
                dias.push({ key, labelDay: WEEK_LABELS[i], labelNum: d.getUTCDate(), fechaLarga, alumnos: [], depaso: [] });
            }
            for (const al of (alumnosData || [])) {
                const pagado = (al.pagos || []).some((p: any) => p.mes?.toLowerCase() === mesActual);
                for (const a of (al.asistencia || [])) {
                    if (!a.presente) continue;
                    const dArg = new Date(new Date(a.fecha).getTime() + ARG);
                    const k = `${dArg.getUTCFullYear()}-${String(dArg.getUTCMonth() + 1).padStart(2, '0')}-${String(dArg.getUTCDate()).padStart(2, '0')}`;
                    const dia = dias.find(d => d.key === k);
                    if (!dia) continue;
                    const hh = dArg.getUTCHours(), mm = dArg.getUTCMinutes();
                    dia.alumnos.push({ nombre: al.nombre, apellido: al.apellido, actividad: a.actividad ?? '', hora: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, id: al._id, pagado });
                }
            }
            dias.forEach(d => d.alumnos.sort((a, b) => b.hora.localeCompare(a.hora)));
            for (const dp of (depasosData?.registros || [])) {
                const dArg = new Date(new Date(dp.fecha).getTime() + ARG);
                const k = `${dArg.getUTCFullYear()}-${String(dArg.getUTCMonth() + 1).padStart(2, '0')}-${String(dArg.getUTCDate()).padStart(2, '0')}`;
                const dia = dias.find(d => d.key === k);
                if (!dia) continue;
                const hh = dArg.getUTCHours(), mm = dArg.getUTCMinutes();
                dia.depaso.push({ nombre: dp.nombre, apellido: dp.apellido, actividad: dp.actividad, hora: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, id: String(dp._id) });
            }
            dias.forEach(d => d.depaso.sort((a, b) => b.hora.localeCompare(a.hora)));
            setDiasData(dias);
            setDiaExpandido(todayKey);
        })
            .catch(() => { })
            .finally(() => setLoadingHoy(false));
    };

    useEffect(() => { fetchAsistencias(); }, [session]);
    useEffect(() => {
        const handler = () => fetchAsistencias();
        window.addEventListener('alumno-de-paso-registrado', handler);
        return () => window.removeEventListener('alumno-de-paso-registrado', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [arrivalToasts, setArrivalToasts] = useState<ArrivalToast[]>([]);
    const [justArrived, setJustArrived] = useState<Set<string>>(new Set());

    const handleArrivals = (items: AttendanceArrival[]) => {
        if (session?.user?.role !== 'recepcion') return;
        const toasts: ArrivalToast[] = items.map(it => ({
            key: `${it.tipo}-${it.id}-${it.fecha}`, nombre: it.nombre, apellido: it.apellido, actividad: it.actividad, tipo: it.tipo,
        }));
        setArrivalToasts(prev => [...prev, ...toasts]);
        setJustArrived(prev => {
            const next = new Set(prev);
            items.forEach(it => next.add(it.tipo === 'alumno' ? `a-${it.id}` : `d-${it.id}`));
            return next;
        });
        toasts.forEach(t => {
            setTimeout(() => setArrivalToasts(prev => prev.filter(x => x.key !== t.key)), 5000);
        });
        items.forEach(it => {
            const hk = it.tipo === 'alumno' ? `a-${it.id}` : `d-${it.id}`;
            setTimeout(() => setJustArrived(prev => { const next = new Set(prev); next.delete(hk); return next; }), 6000);
        });
        fetchAsistencias();
    };

    useAttendanceEvents(handleArrivals, fetchAsistencias);

    useEffect(() => {
        if (session?.user?.role !== 'recepcion') return;
        const tick = () => {
            const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
            setHoraArg(`${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [session?.user?.role]);

    useEffect(() => {
        if (!session || session.user?.role === 'alumno') return;
        fetch('/api/tarifas').then(r => r.json()).then(d => setTarifas(d.tarifas || [])).catch(() => { });
        fetch('/api/recargo').then(r => r.json()).then(d => { setRecargoDiez(d.montoDiez ?? 0); setRecargoMes(d.montoMes ?? 0); }).catch(() => { });
        fetch('/api/gimnasio/alias').then(r => r.json()).then(d => { setAliasGimnasio(d.alias ?? ''); setGimnasioNombre(d.nombre ?? ''); }).catch(() => { });
        fetch('/api/gimnasio/tema').then(r => r.json()).then(d => { if (d?.actividadesRecepcion?.length) setActividadesRecepcion(d.actividadesRecepcion); }).catch(() => { });
    }, [session]);

    const handleConfiguracionTarifas = async () => {
        if (tarifas.length === 0) { await Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontraron cuotas. Por favor, recargá la página.' }); return; }
        const tarifaInputs = tarifas.map(t => `<div><label class="swal-form-label">Días ${t.dias} por semana</label><input type="number" id="tarifa-${t.dias}" class="swal2-input" value="${t.valor}"></div>`).join('');
        const result = await Swal.fire({ ...swalBase, title: 'Configurar Cuotas', html: `<div class="swal-form-body">${tarifaInputs}</div>`, focusConfirm: false, showCancelButton: true, confirmButtonText: 'Aceptar', cancelButtonText: 'Cancelar', preConfirm: () => tarifas.map(t => ({ ...t, valor: Number((document.getElementById(`tarifa-${t.dias}`) as HTMLInputElement).value) })) });
        const nuevasTarifas = result.value as Tarifa[] | undefined;
        if (nuevasTarifas) { try { const res = await fetch('/api/tarifas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevasTarifas) }); if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Cuotas actualizadas' }); setTarifas(nuevasTarifas); } else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las cuotas' }); } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar las cuotas' }); } }
    };

    const handleConfiguracionRecargos = async () => {
        const { value: result } = await Swal.fire({ ...swalBase, title: 'Configurar Recargos', html: `<div class="swal-form-body"><div style="margin-bottom:1rem;"><label class="swal-form-label">Recargo pasando el día 10 del mes ($)</label><input type="text" inputmode="numeric" id="recargo-diez" class="swal2-input" value="${recargoDiez}" placeholder="0"></div><div><label class="swal-form-label">Recargo pasando el mes completo ($)</label><input type="text" inputmode="numeric" id="recargo-mes" class="swal2-input" value="${recargoMes}" placeholder="0"></div></div>`, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', preConfirm: () => { const rawD = (document.getElementById('recargo-diez') as HTMLInputElement)?.value ?? ''; const rawM = (document.getElementById('recargo-mes') as HTMLInputElement)?.value ?? ''; const d = parseInt(rawD.replace(/\D/g, ''), 10) || 0; const m = parseInt(rawM.replace(/\D/g, ''), 10) || 0; return { montoDiez: d, montoMes: m }; } });
        if (result) { try { const res = await fetch('/api/recargo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) }); if (res.ok) { setRecargoDiez(result.montoDiez); setRecargoMes(result.montoMes); Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargos actualizados' }); } else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar los recargos' }); } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar los recargos' }); } }
    };

    const handleConfiguracionAlias = async () => {
        const { value: nuevoAlias } = await Swal.fire({ ...swalBase, title: 'Alias de pago', html: `<p style="font-size:13px;color:#64748b;margin-bottom:12px;">Ingresá el alias de tu cuenta de Mercado Pago para que los alumnos puedan transferirte.</p>`, input: 'text', inputPlaceholder: 'ejemplo.gimnasio.mp', inputValue: aliasGimnasio, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', inputValidator: (v) => !v?.trim() ? 'El alias no puede estar vacío' : null });
        if (nuevoAlias && nuevoAlias.trim() !== aliasGimnasio) { try { const res = await fetch('/api/gimnasio/alias', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alias: nuevoAlias.trim() }) }); if (res.ok) { setAliasGimnasio(nuevoAlias.trim()); Swal.fire({ ...swalNotify, icon: 'success', title: 'Alias guardado' }); } else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo guardar el alias' }); } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al guardar el alias' }); } }
    };

    const TODAS_ACTIVIDADES = ['Musculación', 'Intermitente', 'Otro'];

    const handleToggleActividad = async (actividad: string) => {
        const nuevas = actividadesRecepcion.includes(actividad) ? actividadesRecepcion.filter(a => a !== actividad) : [...actividadesRecepcion, actividad];
        if (nuevas.length === 0) return;
        setSavingActividades(true);
        try { const res = await fetch('/api/gimnasio/tema', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actividadesRecepcion: nuevas }) }); if (res.ok) setActividadesRecepcion(nuevas); } finally { setSavingActividades(false); }
    };

    const handleAlumnoDePasoGlobal = async () => {
        const actividadesDisp = actividadesRecepcion.length > 0 ? actividadesRecepcion : ['Musculación'];
        const { value: datos } = await Swal.fire({ ...swalBase, title: 'Alumno de paso', html: `<div class="swal-form-body"><div><label class="swal-form-label">Nombre *</label><input id="dp-nombre" class="swal2-input" placeholder="Nombre"></div><div><label class="swal-form-label">Apellido *</label><input id="dp-apellido" class="swal2-input" placeholder="Apellido"></div><div><label class="swal-form-label">Actividad</label><select id="dp-actividad" class="swal2-input">${actividadesDisp.map((a: string) => `<option value="${a}">${a}</option>`).join('')}</select></div><div><label class="swal-form-label">Monto ($)</label><input id="dp-monto" class="swal2-input" inputmode="numeric" placeholder="0"></div><div><label class="swal-form-label">Método de pago</label><select id="dp-metodo" class="swal2-input"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option></select></div></div>`, focusConfirm: false, showCancelButton: true, confirmButtonText: 'Registrar', cancelButtonText: 'Cancelar', preConfirm: () => { const nombre = (document.getElementById('dp-nombre') as HTMLInputElement).value.trim(); const apellido = (document.getElementById('dp-apellido') as HTMLInputElement).value.trim(); if (!nombre || !apellido) { Swal.showValidationMessage('Nombre y apellido son obligatorios'); return; } return { nombre, apellido, actividad: (document.getElementById('dp-actividad') as HTMLSelectElement).value, monto: Number((document.getElementById('dp-monto') as HTMLInputElement).value.replace(/\D/g, '')) || 0, metodoPago: (document.getElementById('dp-metodo') as HTMLSelectElement).value }; } });
        if (!datos) return;
        try { const res = await fetch('/api/alumnos-de-paso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }); if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno de paso registrado' }); fetchAsistencias(); } else { const err = await res.json(); Swal.fire({ ...swalNotify, icon: 'error', title: err.error || 'Error al registrar' }); } } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar' }); }
    };

    if (!session) return null;
    if (session.user?.role === 'alumno') return null;

    const userRole = session.user?.role ?? '';
    const esDueño = userRole === 'dueño' || userRole === 'admin';
    const esProfesor = userRole === 'profesor';
    const esRecepcion = userRole === 'recepcion';
    const visibleCards = NAV_CARDS.filter(c => {
        if (!c.role) return true;
        if (c.role === userRole) return true;
        if (c.role === 'dueño' && userRole === 'admin') return true;
        return false;
    });

    const pagoBarColor = !data ? 'bg-white/[0.1]' : data.porcentajePagados >= 80 ? 'bg-lime-400' : data.porcentajePagados >= 50 ? 'bg-amber-400' : 'bg-red-500';
    const mesLabel = data ? capitalize(data.mes) : '';

    const configItems = [
        { label: 'Alumno de paso', sub: 'Registrar ingreso del día', onClick: handleAlumnoDePasoGlobal, icon: <UserPlus size={15} className="text-white" /> },
        { label: 'Cuotas', sub: 'Precios por días/semana', onClick: handleConfiguracionTarifas, icon: <Banknote size={15} className="text-white" /> },
        { label: 'Recargo', sub: 'Día 10 y mes vencido', onClick: handleConfiguracionRecargos, icon: <AlertCircle size={15} className="text-white" /> },
        { label: 'Alias de pago', sub: aliasGimnasio || 'Sin configurar', onClick: handleConfiguracionAlias, icon: <Link2 size={15} className="text-white" /> },
    ];

    // ── Recepción view ────────────────────────────────────────────────────────
    if (esRecepcion) {
        const diaHoy = new Date().getDate();
        const pasoDiez = diaHoy > 10;
        const ARG_OFF = -3 * 60 * 60 * 1000;
        const nowArgUI = new Date(Date.now() + ARG_OFF);
        const todayKey = `${nowArgUI.getUTCFullYear()}-${String(nowArgUI.getUTCMonth() + 1).padStart(2, '0')}-${String(nowArgUI.getUTCDate()).padStart(2, '0')}`;
        const diaActivo = diasData.find(d => d.key === diaExpandido) ?? null;
        const totalActivo = diaActivo ? diaActivo.alumnos.length + diaActivo.depaso.length : 0;
        const slotOf = (hora: string) => {
            const h = parseInt(hora.split(':')[0]);
            if (h < 12) return 'Mañana';
            if (h < 15) return 'Siesta';
            if (h < 20) return 'Tarde';
            return 'Noche';
        };
        type Slot = 'Mañana' | 'Siesta' | 'Tarde' | 'Noche';
        const SLOTS: { key: Slot; icon: React.ReactNode; accent: string; accentBg: string }[] = [
            { key: 'Mañana', icon: <Sun size={14} />,    accent: 'text-amber-400',  accentBg: 'bg-amber-400/10 border-amber-400/20' },
            { key: 'Siesta', icon: <Coffee size={14} />, accent: 'text-orange-400', accentBg: 'bg-orange-400/10 border-orange-400/20' },
            { key: 'Tarde',  icon: <Sunset size={14} />, accent: 'text-sky-400',    accentBg: 'bg-sky-400/10 border-sky-400/20' },
            { key: 'Noche',  icon: <Moon size={14} />,   accent: 'text-violet-400', accentBg: 'bg-violet-400/10 border-violet-400/20' },
        ];
        const bySlot: Record<string, AlumnoAsistencia[]> = { Mañana: [], Siesta: [], Tarde: [], Noche: [] };
        if (diaActivo) for (const a of diaActivo.alumnos) bySlot[slotOf(a.hora)].push(a);

        const deudoresHoy = diaActivo?.alumnos.filter(a => !a.pagado && pasoDiez).length ?? 0;

        const PAGE_SIZE = 8;
        const allList: AlumnoAsistencia[] = activeSlot
            ? (bySlot[activeSlot] ?? [])
            : (diaActivo?.alumnos ?? []);
        const totalPages = Math.ceil(allList.length / PAGE_SIZE);
        const listToShow = allList.slice(listPage * PAGE_SIZE, (listPage + 1) * PAGE_SIZE);

        return (
            <div className="min-h-screen bg-[#0a0a0a]">
                {/* Dot grid full page */}
                <div className="fixed inset-0 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <ArrivalToastStack toasts={arrivalToasts} />

                <div className="relative max-w-[1400px] mx-auto px-5 py-4 flex flex-col gap-3">

                    {/* ── TOP BAR ────────────────────────────────────────── */}
                    <BlurFade delay={0}>
                        <div className="relative flex items-center justify-between" style={{ minHeight: 72 }}>
                            {/* Left: label */}
                            <div className="flex items-center w-[280px] shrink-0 self-center">
                                <span className="text-white/60 text-[11px] font-bold uppercase tracking-[0.2em]">Recepción</span>
                            </div>

                            {/* Center: clock — truly centered via absolute */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-white font-black text-5xl tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
                                    {horaArg || '--:--'}
                                </p>
                            </div>

                            {/* Right: action buttons */}
                            <div className="flex items-center gap-2 w-[280px] shrink-0 justify-end self-center">
                                <Link href="/alumnos"
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-all text-white/60 hover:text-white text-xs font-semibold">
                                    <Users size={13} />
                                    Alumnos
                                </Link>
                                <Link href="/alumnos/nuevo"
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-all text-white/60 hover:text-white text-xs font-semibold">
                                    <UserPlus size={13} />
                                    Nuevo
                                </Link>
                                <button onClick={handleAlumnoDePasoGlobal}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-lime-400 hover:bg-lime-300 active:bg-lime-500 text-black font-bold text-xs rounded-xl transition-all shadow-md shadow-lime-400/20 whitespace-nowrap">
                                    <UserPlus size={13} />
                                    De paso
                                </button>
                            </div>
                        </div>
                    </BlurFade>

                    {/* ── MAIN GRID ──────────────────────────────────────── */}
                    <div className="flex gap-4">

                        {/* LEFT: day selector + slot stats */}
                        <BlurFade delay={0.06} className="flex flex-col gap-2.5 w-52 shrink-0">
                            {/* Day pills */}
                            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-2 flex flex-col gap-1">
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.16em] px-2 py-1">Semana</p>
                                {loadingHoy && diasData.length === 0
                                    ? [1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-xl bg-white/[0.06] animate-pulse" />)
                                    : diasData.map(dia => {
                                        const total = dia.alumnos.length + dia.depaso.length;
                                        const sel = diaExpandido === dia.key;
                                        const isToday = dia.key === todayKey;
                                        return (
                                            <button key={dia.key}
                                                onClick={() => { setDiaExpandido(sel ? null : dia.key); setActiveSlot(null); setListPage(0); }}
                                                className={cn(
                                                    'flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left',
                                                    sel ? 'bg-lime-400 shadow-md shadow-lime-400/20' : 'hover:bg-white/[0.06]',
                                                )}>
                                                <div className="flex items-center gap-2.5">
                                                    <span className={cn('text-[11px] font-black uppercase tracking-[0.14em] w-6', sel ? 'text-black/50' : 'text-white/60')}>{dia.labelDay}</span>
                                                    <span className={cn('text-2xl font-bold leading-none tabular-nums', sel ? 'text-black' : isToday ? 'text-white' : 'text-white/75')}>{dia.labelNum}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {isToday && !sel && <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />}
                                                    {total > 0 && <span className={cn('text-sm font-bold tabular-nums', sel ? 'text-black/60' : 'text-white/65')}>{total}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>

                            {/* Slot stat cards */}
                            {diaActivo && (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {SLOTS.map(slot => {
                                        const count = bySlot[slot.key].length;
                                        const isActive = activeSlot === slot.key;
                                        return (
                                            <button key={slot.key}
                                                onClick={() => { setActiveSlot(isActive ? null : slot.key); setListPage(0); }}
                                                className={cn(
                                                    'flex flex-col gap-1.5 p-3 rounded-2xl border transition-all text-left',
                                                    isActive
                                                        ? 'bg-lime-400 border-lime-400 shadow-md shadow-lime-400/20'
                                                        : count > 0 ? 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.07]'
                                                        : 'bg-white/[0.02] border-white/[0.04]',
                                                )}>
                                                <span className={isActive ? 'text-black' : count > 0 ? slot.accent : 'text-white/35'}>
                                                    {slot.icon}
                                                </span>
                                                <div>
                                                    <p className={cn('text-2xl font-black leading-none tabular-nums', isActive ? 'text-black' : count > 0 ? 'text-white' : 'text-white/35')}>
                                                        {loadingHoy ? '·' : count}
                                                    </p>
                                                    <p className={cn('text-[10px] font-bold uppercase tracking-wide mt-0.5', isActive ? 'text-black/50' : count > 0 ? slot.accent : 'text-white/35')}>
                                                        {slot.key}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Summary badges */}
                            {diaActivo && totalActivo > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserCheck size={12} className="text-lime-400" />
                                            <span className="text-white/70 text-xs font-semibold">Total hoy</span>
                                        </div>
                                        <span className="text-white font-black text-base tabular-nums">{totalActivo}</span>
                                    </div>
                                    {deudoresHoy > 0 && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={12} className="text-red-400" />
                                                <span className="text-red-400/70 text-xs font-semibold">Con deuda</span>
                                            </div>
                                            <span className="text-red-400 font-black text-base tabular-nums">{deudoresHoy}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </BlurFade>

                        {/* RIGHT: attendee list */}
                        <BlurFade delay={0.1} className="flex-1 flex flex-col gap-0 min-w-0">
                            <div className="bg-white/[0.04] border border-white/[0.07] rounded-[1.5rem] overflow-hidden flex flex-col">
                                {/* List header */}
                                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-3">
                                        <Activity size={15} className="text-lime-400" />
                                        <span className="text-white font-bold text-base capitalize">
                                            {diaActivo?.fechaLarga ?? 'Seleccioná un día'}
                                        </span>
                                        {activeSlot && (
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/[0.08] text-white/75">
                                                {activeSlot}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {loadingHoy && (
                                            <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-lime-400 animate-spin" />
                                        )}
                                        {activeSlot && (
                                            <button onClick={() => { setActiveSlot(null); setListPage(0); }}
                                                className="text-xs text-white/60 hover:text-white font-semibold transition-colors">
                                                Ver todos
                                            </button>
                                        )}
                                        {listToShow.length > 0 && (
                                            <span className="text-white/60 text-sm font-semibold">{listToShow.length} {listToShow.length === 1 ? 'asistente' : 'asistentes'}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Attendee rows */}
                                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                    {!diaActivo ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                                                <Clock size={22} className="text-white/45" />
                                            </div>
                                            <p className="text-white/55 text-sm font-medium">Seleccioná un día para ver asistencias</p>
                                        </div>
                                    ) : listToShow.length === 0 && diaActivo.depaso.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                                                <Users size={22} className="text-white/45" />
                                            </div>
                                            <p className="text-white/55 text-sm font-medium">
                                                {activeSlot ? `Sin asistentes en el turno ${activeSlot.toLowerCase()}` : 'Sin asistencias este día'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Alumnos */}
                                            {listToShow.length > 0 && (
                                                <AnimatePresence initial={false}>
                                                    {listToShow.map((a) => {
                                                        const debe = !a.pagado && pasoDiez;
                                                        const sinCuota = !a.pagado && !pasoDiez;
                                                        const isNew = justArrived.has(`a-${a.id}`);
                                                        return (
                                                            <motion.div
                                                                key={`${a.id}-${a.hora}`}
                                                                layout
                                                                initial={isNew ? { opacity: 0, y: -12, scale: 0.97 } : false}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.92, x: -24, transition: { duration: 0.3, ease: 'easeIn' } }}
                                                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                                                className={cn(
                                                                    'border-b border-white/[0.04] last:border-b-0 transition-all duration-700',
                                                                    isNew && 'ring-1 ring-inset ring-lime-400/50 bg-lime-400/[0.05]',
                                                                )}
                                                            >
                                                                <Link href={`/alumnos/${a.id}/historial`}
                                                                    className={cn(
                                                                        'flex items-center gap-3 px-5 py-2.5 transition-all group',
                                                                        debe ? 'hover:bg-red-500/10' : 'hover:bg-white/[0.04]',
                                                                    )}>
                                                                    <div className={cn(
                                                                        'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                                                                        debe ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.08] text-white/60',
                                                                    )}>
                                                                        {a.nombre?.[0]}{a.apellido?.[0]}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={cn('font-semibold text-base truncate', debe ? 'text-red-300' : 'text-white/90')}>
                                                                            {a.apellido}, {a.nombre}
                                                                        </p>
                                                                        <p className="text-xs text-white/55 mt-0.5">{a.actividad}</p>
                                                                    </div>
                                                                    {isNew && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-400 text-black shrink-0">
                                                                            <CheckCircle2 size={8} /> Nuevo
                                                                        </span>
                                                                    )}
                                                                    {debe && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shrink-0">
                                                                            <AlertTriangle size={8} /> Debe
                                                                        </span>
                                                                    )}
                                                                    {sinCuota && (
                                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.07] text-white/55 shrink-0">Sin cuota</span>
                                                                    )}
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <span className="text-white/55 text-sm tabular-nums font-medium">{a.hora}</span>
                                                                        <ChevronRight size={11} className="text-white/30 group-hover:text-white/60 transition-colors" />
                                                                    </div>
                                                                </Link>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            )}

                                            {/* Pagination */}
                                            {totalPages > 1 && (
                                                <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
                                                    <button
                                                        onClick={() => setListPage(p => Math.max(0, p - 1))}
                                                        disabled={listPage === 0}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-20 disabled:cursor-not-allowed text-white/50 hover:text-white hover:bg-white/[0.06]">
                                                        <ChevronLeft size={14} /> Anterior
                                                    </button>
                                                    <div className="flex items-center gap-1.5">
                                                        {Array.from({ length: totalPages }, (_, i) => (
                                                            <button key={i} onClick={() => setListPage(i)}
                                                                className={cn(
                                                                    'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                                                                    i === listPage ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
                                                                )}>
                                                                {i + 1}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => setListPage(p => Math.min(totalPages - 1, p + 1))}
                                                        disabled={listPage === totalPages - 1}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-20 disabled:cursor-not-allowed text-white/50 hover:text-white hover:bg-white/[0.06]">
                                                        Siguiente <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* De paso section */}
                                            {diaActivo.depaso.length > 0 && (
                                                <div className="border-t border-white/[0.06]">
                                                    <div className="flex items-center gap-2 px-5 py-2.5 bg-teal-400/[0.06]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400">De paso</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400/15 text-teal-400">{diaActivo.depaso.length}</span>
                                                    </div>
                                                    <AnimatePresence initial={false}>
                                                        {diaActivo.depaso.map((a) => {
                                                            const isNew = justArrived.has(`d-${a.id}`);
                                                            return (
                                                                <motion.div
                                                                    key={`dp-${a.id}-${a.hora}`}
                                                                    layout
                                                                    initial={isNew ? { opacity: 0, y: -12, scale: 0.97 } : false}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.92, x: -24, transition: { duration: 0.3, ease: 'easeIn' } }}
                                                                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                                                    className={cn(
                                                                        'flex items-center gap-3 px-5 py-2.5 border-b border-white/[0.04] last:border-b-0 hover:bg-teal-400/[0.04] transition-all duration-700',
                                                                        isNew && 'ring-1 ring-inset ring-teal-400/50 bg-teal-400/[0.06]',
                                                                    )}>
                                                                    <div className="w-10 h-10 rounded-xl bg-teal-400/10 flex items-center justify-center text-sm font-bold text-teal-400 shrink-0">
                                                                        {a.nombre?.[0]}{a.apellido?.[0]}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-base font-semibold text-white/85 truncate">{a.apellido}, {a.nombre}</p>
                                                                        <p className="text-xs text-teal-400/70 mt-0.5">{a.actividad}</p>
                                                                    </div>
                                                                    {isNew && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400 text-black shrink-0">
                                                                            <CheckCircle2 size={8} /> Nuevo
                                                                        </span>
                                                                    )}
                                                                    <span className="text-white/55 text-sm tabular-nums font-medium shrink-0">{a.hora}</span>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </BlurFade>
                    </div>
                </div>
            </div>
        );
    }

    // ── Dueño / Admin / Profesor view ─────────────────────────────────────────
    const userName = (session.user as any)?.nombre
        ? capitalize((session.user as any).nombre)
        : capitalize(session.user?.username ?? 'Usuario');

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Dot grid */}
            <div className="fixed inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative max-w-5xl mx-auto px-4 pt-4 pb-20">

                {/* ── HERO ────────────────────────────────────────────────── */}
                <BlurFade delay={0}>
                    <div className="relative bg-[#111] rounded-[2rem] overflow-hidden mb-4">
                        <div className="absolute inset-0"
                            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        <div className="absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl" style={{ background: 'rgba(163,230,53,0.06)' }} />
                        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/[0.06] rounded-full blur-3xl" />

                        <div className="relative px-5 pt-5 pb-5">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="text-xs font-semibold text-white/60 uppercase tracking-[0.14em]">{getGreeting()}</span>
                                <span className="text-white/30 text-xs">·</span>
                                <span className="text-xs text-white/55 capitalize">{fmtDate()}</span>
                            </div>

                            <h1 className="text-3xl font-bold text-white tracking-tight mb-3">{userName}</h1>

                            <div className="flex items-center gap-2 flex-wrap mb-5">
                                <span className="inline-flex items-center bg-white/[0.1] border border-white/[0.13] text-white/75 text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                                    {session.user?.role}
                                </span>
                                {gimnasioNombre && (
                                    <span className="text-white/55 text-xs font-medium">{gimnasioNombre}</span>
                                )}
                            </div>

                            {/* Nav pills — wrap en mobile, sin overflow oculto */}
                            <div className="flex flex-wrap gap-2">
                                {visibleCards.map((c) => (
                                    <Link key={c.href} href={c.href}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.15] active:scale-95 transition-all text-white/80 hover:text-white text-sm font-semibold">
                                        <span className="opacity-90">{c.icon}</span>
                                        {c.label}
                                    </Link>
                                ))}
                                {esProfesor && session.user?.id && (
                                    <Link href="/mi-perfil#plan"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.15] active:scale-95 transition-all text-white/80 hover:text-white text-sm font-semibold">
                                        <FileText size={15} className="opacity-90" />
                                        Mi plan
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </BlurFade>

                {/* ── STATS ───────────────────────────────────────────────── */}
                <div>
                    <div>
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : data && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                                {/* Balance */}
                                {esDueño && (
                                    <BlurFade delay={0.1}>
                                        <StatCard>
                                            <div className="flex items-start justify-between mb-3">
                                                <StatLabel>Balance · {mesLabel}</StatLabel>
                                                <button onClick={toggleBalance}
                                                    className="w-6 h-6 rounded-lg bg-white/[0.07] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0 -mt-0.5">
                                                    {showBalance ? <Eye size={12} /> : <EyeOff size={12} />}
                                                </button>
                                            </div>
                                            <p className={cn('text-3xl font-bold leading-none tracking-tight', data.balance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                                {showBalance
                                                    ? <>{data.balance < 0 ? '−' : ''}$<NumberTicker value={Math.abs(data.balance)} /></>
                                                    : '$ ••••'}
                                            </p>
                                            {showBalance && (
                                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.08]">
                                                    <div>
                                                        <p className="text-xs font-bold text-emerald-400">+${fmt(data.ingresosCuotas + data.ingresosExtra)}</p>
                                                        <p className="text-[10px] text-white/50 mt-0.5">ingresos</p>
                                                    </div>
                                                    <div className="w-px h-5 bg-white/[0.1] shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold text-red-400">−${fmt(data.gastosMes)}</p>
                                                        <p className="text-[10px] text-white/50 mt-0.5">egresos</p>
                                                    </div>
                                                </div>
                                            )}
                                        </StatCard>
                                    </BlurFade>
                                )}

                                {/* Cuotas */}
                                {!esProfesor && !esRecepcion && (
                                    <BlurFade delay={0.14}>
                                        <StatCard>
                                            <StatLabel>Cuotas · {mesLabel}</StatLabel>
                                            <div className="flex items-stretch gap-2 mb-3">
                                                <div className="flex-1 text-center">
                                                    <p className="text-3xl font-bold text-emerald-400 leading-none tabular-nums">
                                                        <NumberTicker value={data.pagados} />
                                                    </p>
                                                    <p className="text-xs text-emerald-400/80 mt-1.5 font-semibold">Pagaron</p>
                                                </div>
                                                <div className="w-px bg-white/[0.1] self-stretch" />
                                                <div className="flex-1 text-center">
                                                    <p className="text-3xl font-bold text-red-400 leading-none tabular-nums">
                                                        <NumberTicker value={data.totalAlumnos - data.pagados} />
                                                    </p>
                                                    <p className="text-xs text-red-400/80 mt-1.5 font-semibold">Deben</p>
                                                </div>
                                            </div>
                                            <AnimatedBar pct={data.porcentajePagados} color={pagoBarColor} />
                                            <p className="text-xs text-white/55 mt-2 text-right font-medium">{data.porcentajePagados}% pagado</p>
                                        </StatCard>
                                    </BlurFade>
                                )}

                                {/* Asistencias hoy */}
                                <BlurFade delay={0.18}>
                                    <StatCard>
                                        <div className="flex items-start justify-between mb-3">
                                            <StatLabel>Asistencias · Hoy</StatLabel>
                                            <p className="text-3xl font-bold text-white leading-none tabular-nums -mt-0.5">
                                                <NumberTicker value={data.asistenciasHoy} />
                                            </p>
                                        </div>
                                        {data.asistenciasHoy > 0 ? (
                                            <div className="flex gap-4 flex-wrap">
                                                {(data.asistenciasHoyFranja?.manana ?? 0) > 0 && (
                                                    <div>
                                                        <p className="text-base font-bold text-white tabular-nums">{data.asistenciasHoyFranja.manana}</p>
                                                        <p className="text-[10px] text-white/50 mt-0.5">Mañana</p>
                                                    </div>
                                                )}
                                                {(data.asistenciasHoyFranja?.siesta ?? 0) > 0 && (
                                                    <div>
                                                        <p className="text-base font-bold text-white tabular-nums">{data.asistenciasHoyFranja.siesta}</p>
                                                        <p className="text-[10px] text-white/50 mt-0.5">Siesta</p>
                                                    </div>
                                                )}
                                                {(data.asistenciasHoyFranja?.tarde ?? 0) > 0 && (
                                                    <div>
                                                        <p className="text-base font-bold text-white tabular-nums">{data.asistenciasHoyFranja.tarde}</p>
                                                        <p className="text-[10px] text-white/50 mt-0.5">Tarde</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-white/50">Sin registros aún</p>
                                        )}
                                    </StatCard>
                                </BlurFade>

                                {/* Planes venciendo */}
                                <BlurFade delay={0.22}>
                                    <StatCard>
                                        <div className="flex items-start justify-between mb-3">
                                            <StatLabel>Planes venciendo</StatLabel>
                                            <p className={cn('text-3xl font-bold leading-none tabular-nums -mt-0.5', data.planesVenciendo.length > 0 ? 'text-amber-400' : 'text-white')}>
                                                <NumberTicker value={data.planesVenciendo.length} />
                                            </p>
                                        </div>
                                        {data.planesVenciendo.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {data.planesVenciendo.slice(0, 3).map(a => (
                                                    <Link key={a._id} href={`/alumnos/${a._id}/historial`}
                                                        className="flex items-center gap-2 group">
                                                        <span className={cn(
                                                            'text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 leading-none',
                                                            a.diasRestantes === 0 ? 'bg-red-500' : 'bg-amber-400',
                                                        )}>
                                                            {a.diasRestantes}
                                                        </span>
                                                        <span className="text-xs text-white/70 truncate group-hover:text-white transition-colors">
                                                            {a.apellido}, {a.nombre}
                                                        </span>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-white/50">Sin vencimientos</p>
                                        )}
                                    </StatCard>
                                </BlurFade>
                            </div>
                        )}
                    </div>

                    {/* Config panel */}
                    {!esProfesor && !esRecepcion && (
                        <BlurFade delay={0.26} className="mt-4">
                            <p className="text-xs font-bold text-white/50 uppercase tracking-[0.12em] mb-3">Configuración</p>
                            <div className="bg-white/[0.07] border border-white/[0.1] rounded-2xl overflow-hidden">
                                {configItems.map((item, idx, arr) => (
                                    <div key={item.label}>
                                        <button onClick={item.onClick}
                                            className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left">
                                            <div className="w-9 h-9 rounded-xl bg-white/[0.1] flex items-center justify-center shrink-0">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-white">{item.label}</p>
                                                <p className="text-xs text-white/50 truncate mt-0.5">{item.sub}</p>
                                            </div>
                                            <ChevronRight size={15} className="text-white/30 shrink-0" />
                                        </button>
                                        {idx < arr.length - 1 && <div className="border-t border-white/[0.06] mx-4" />}
                                    </div>
                                ))}

                                {/* Actividades recepción */}
                                <div className="border-t border-white/[0.06] px-4 py-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-white/[0.1] flex items-center justify-center shrink-0">
                                            <Users size={16} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-white">Recepción</p>
                                            <p className="text-xs text-white/50 mt-0.5">Actividades disponibles</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {TODAS_ACTIVIDADES.map(act => {
                                            const activa = actividadesRecepcion.includes(act);
                                            const esUltima = activa && actividadesRecepcion.length === 1;
                                            return (
                                                <button key={act} onClick={() => handleToggleActividad(act)}
                                                    disabled={savingActividades || esUltima}
                                                    className={cn(
                                                        'flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors',
                                                        activa ? 'bg-lime-400/[0.1]' : 'bg-white/[0.04]',
                                                    )}>
                                                    <span className={cn('text-sm font-medium', activa ? 'text-lime-400' : 'text-white/60')}>
                                                        {act}
                                                    </span>
                                                    <div className={cn('w-10 h-5 rounded-full relative transition-colors', activa ? 'bg-lime-400' : 'bg-white/[0.15]')}>
                                                        <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                                                            style={{ left: activa ? '22px' : '2px' }} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </BlurFade>
                    )}
                </div>
            </div>
        </div>
    );
}
