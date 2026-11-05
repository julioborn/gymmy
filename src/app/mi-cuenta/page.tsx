'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import {
    ChartBar, Clock3, Dumbbell, EyeOff,
    CheckCircle2, XCircle, AlertCircle, ChevronRight,
    Copy, Check, ExternalLink, Trophy, Flame,
    ChevronLeft, ChevronDown, Banknote, CalendarCheck,
    Users, UserPlus, Search, Wallet, Landmark, Settings, Bell,
} from 'lucide-react';
import { pagoVigente, estaAlDia } from '@/lib/pagos';
import { esStaffAlumno } from '@/lib/staffAlumnos';
import AlumnoRegistroForm from '@/components/AlumnoRegistroForm';
import Swal from 'sweetalert2';
import { swalBase, swalNotify } from '@/utils/swalConfig';

// ─── Utils ────────────────────────────────────────────────────────────────────
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── Magic UI: NumberTicker ────────────────────────────────────────────────────
function NumberTicker({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
            onUpdate(v) { setDisplay(Math.floor(v)); },
        });
        return ctrl.stop;
    }, [value]);
    return <>{display}</>;
}

// ─── Magic UI: BlurFade ────────────────────────────────────────────────────────
function BlurFade({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

// ─── Magic UI: Animated Progress ──────────────────────────────────────────────
function AnimatedProgress({ pct, color = 'bg-lime-400', trackColor = 'bg-white/10' }: { pct: number; color?: string; trackColor?: string }) {
    return (
        <div className={cn('w-full rounded-full h-1.5 overflow-hidden', trackColor)}>
            <motion.div
                className={cn('h-full rounded-full', color)}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
        </div>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Asistencia { _id: string; fecha: string; presente: boolean; actividad: string; }
interface Pago { _id: string; mes: string; fechaPago: string; tarifa: number; diasMusculacion: number; metodoPago: string; }
interface PlanEntrenamiento { fechaInicio: string | null; duracion: number | null; diasRestantes: number | null; terminado: boolean; }
interface PlanHistorial { _id?: string; fechaInicio: string; fechaFin: string; duracion: number; asistenciasContadas: number; }
interface Alumno {
    _id: string; nombre: string; apellido: string; dni: string; email?: string;
    asistencia: Asistencia[]; pagos: Pago[];
    planEntrenamiento: PlanEntrenamiento; planEntrenamientoHistorial: PlanHistorial[];
    gimnasioId: { nombre: string; logoUrl?: string };
    exentoCuota?: boolean;
}
interface EjercicioAsignado {
    nombre: string; notas: string;
    trepada1: string; trepada2: string; trepada3: string; trepada4: string; trepada5: string; trepada6: string; trepada7: string;
    semana1: string; semana2: string; semana3: string; semana4: string; semana5: string; semana6: string; semana7: string;
    kg: string;
    kgAlumno1: string; kgAlumno2: string; kgAlumno3: string; kgAlumno4: string; kgAlumno5: string; kgAlumno6: string; kgAlumno7: string;
    observacionesAlumno1: string; observacionesAlumno2: string; observacionesAlumno3: string;
    observacionesAlumno4: string; observacionesAlumno5: string; observacionesAlumno6: string; observacionesAlumno7: string;
    grupoCombo: string;
}
interface DiaAsignado { titulo: string; descripcion: string; bloqueActivacion: string; ejercicios: EjercicioAsignado[]; }
interface PlanEjAsignado {
    _id: string; nombre: string; categoria: string; descripcion: string; totalSemanas: number; fechaInicio?: string;
    entradaCalor: { ejercicios: { nombre: string; notas: string }[] };
    dias: DiaAsignado[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];
const ACTIVIDAD_DOT: Record<string, string> = { 'Musculación': 'bg-blue-400', 'Intermitente': 'bg-orange-400', 'Otro': 'bg-yellow-400' };
const ACTIVIDAD_COLOR: Record<string, string> = { 'Musculación': '#60a5fa', 'Intermitente': '#f97316', 'Otro': '#eab308' };
const COMBO_PALETTE = [
    { bg: 'rgba(244,163,71,0.07)', labelColor: '#d97706', dotColor: '#d97706' },
    { bg: 'rgba(16,185,129,0.07)', labelColor: '#059669', dotColor: '#059669' },
    { bg: 'rgba(59,130,246,0.07)', labelColor: '#2563eb', dotColor: '#2563eb' },
    { bg: 'rgba(139,92,246,0.07)', labelColor: '#7c3aed', dotColor: '#7c3aed' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalDateKey(fechaStr: string): string {
    const d = new Date(fechaStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function planDateToKey(fecha: string | Date): string {
    const d = new Date(fecha);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() + offset * 60 * 1000);
    return `${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}-${String(local.getDate()).padStart(2,'0')}`;
}
function getCalendarDays(year: number, month: number): (number | null)[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
}
function getInitials(nombre?: string, apellido?: string) { return `${nombre?.[0]??''}${apellido?.[0]??''}`.toUpperCase(); }

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MiCuentaPage() {
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [loading, setLoading] = useState(true);

    const validTabs = ['resumen', 'historial', 'plan', 'avisos', 'staff'] as const;
    type Tab = typeof validTabs[number];
    const getInitialTab = (): Tab => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.replace('#', '') as Tab;
            if (validTabs.includes(hash)) return hash;
        }
        return 'resumen';
    };
    const [tab, setTab] = useState<Tab>(getInitialTab);
    const changeTab = (t: Tab) => { setTab(t); window.location.hash = t; };

    const [loadingPago, setLoadingPago] = useState(false);
    const [pagoResult, setPagoResult] = useState<'ok'|'error'|'pendiente'|null>(null);
    const [aliasGimnasio, setAliasGimnasio] = useState('');
    const [tarifas, setTarifas] = useState<{ dias: number; valor: number }[]>([]);
    const [aliasCopied, setAliasCopied] = useState(false);
    const [planEj, setPlanEj] = useState<PlanEjAsignado | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [savingEj, setSavingEj] = useState<number | null>(null);
    const [selectedSemana, setSelectedSemana] = useState(1);
    const [selectedDia, setSelectedDia] = useState(0);
    const [expandedEj, setExpandedEj] = useState<number | null>(null);
    const [showCalentamiento, setShowCalentamiento] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInResult, setCheckInResult] = useState<'ok'|'duplicate'|'error'|null>(null);
    const [acento, setAcento] = useState('#a3e635');

    const [vigAlumnos, setVigAlumnos] = useState<{ _id: string; nombre: string; apellido: string; dni: string; asistencia: { fecha: string; presente: boolean; actividad: string }[] }[]>([]);
    const [vigWatching, setVigWatching] = useState<Set<string>>(new Set());
    const [vigLoading, setVigLoading] = useState(false);
    const [vigSearch, setVigSearch] = useState('');
    const [vigToggling, setVigToggling] = useState<string | null>(null);
    const [vigSubTab, setVigSubTab] = useState<'avisos' | 'hoy'>('avisos');
    const [vigSlotsExpanded, setVigSlotsExpanded] = useState<Record<string, boolean>>({ Mañana: false, Siesta: false, Tarde: false, Noche: false });
    const avatarTapCount = useRef(0);
    const avatarTapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isWatcher = alumno?.dni === '43844409';

    useEffect(() => {
        if (tab !== 'avisos' || !isWatcher || vigAlumnos.length > 0) return;
        setVigLoading(true);
        fetch('/api/alumno/vigilancia').then(r => r.json()).then(d => {
            if (d.ok) {
                setVigAlumnos(d.alumnos || []);
                setVigWatching(new Set(d.watching || []));
            }
        }).catch(() => {}).finally(() => setVigLoading(false));
    }, [tab, isWatcher]);

    type StaffAlumno = { _id: string; nombre: string; apellido: string; dni: string; telefono?: string; exentoCuota?: boolean; asistencia: { fecha: string; presente: boolean; actividad: string }[]; pagos: { mes: string; esEspecial?: boolean; fechaDesde?: string|null; fechaHasta?: string|null }[] };
    const [staffAlumnos, setStaffAlumnos] = useState<StaffAlumno[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');
    const [staffSubTab, setStaffSubTab] = useState<'lista' | 'hoy' | 'caja' | 'nuevo'>('lista');
    const [staffSlotsExpanded, setStaffSlotsExpanded] = useState<Record<string, boolean>>({ Mañana: false, Siesta: false, Tarde: false, Noche: false });
    const isStaffAlumno = esStaffAlumno(alumno?.dni);

    useEffect(() => {
        if (tab !== 'staff' || !isStaffAlumno || staffAlumnos.length > 0) return;
        setStaffLoading(true);
        fetch('/api/alumno/staff/alumnos').then(r => r.json()).then(d => {
            if (d.ok) setStaffAlumnos(d.alumnos || []);
        }).catch(() => {}).finally(() => setStaffLoading(false));
    }, [tab, isStaffAlumno]);

    type DetallePagoCaja = { tipo: 'cuota' | 'depaso'; nombre: string; apellido: string; metodoPago: string; monto: number; fecha: string };
    type CajaPreview = { fechaDesde: string; fechaHasta: string; totalEfectivo: number; totalTransferencia: number; totalOtros: number; totalGeneral: number; cantidadPagos: number; detalle: DetallePagoCaja[] };
    type CierreCajaRow = { _id: string; fechaDesde: string; fechaHasta: string; totalEfectivo: number; totalTransferencia: number; totalOtros: number; totalGeneral: number; cantidadPagos: number; registradoPorNombre: string };
    const [cajaPreview, setCajaPreview] = useState<CajaPreview | null>(null);
    const [cajaCierres, setCajaCierres] = useState<CierreCajaRow[]>([]);
    const [cajaLoading, setCajaLoading] = useState(false);
    const [cajaAbierto, setCajaAbierto] = useState<string | null>(null);
    const [cajaDetalles, setCajaDetalles] = useState<Record<string, DetallePagoCaja[]>>({});
    const [cajaDetalleLoading, setCajaDetalleLoading] = useState<string | null>(null);

    useEffect(() => {
        if (tab !== 'staff' || staffSubTab !== 'caja' || !isStaffAlumno || cajaPreview) return;
        setCajaLoading(true);
        fetch('/api/alumno/staff/caja').then(r => r.json()).then(d => {
            if (d.ok) { setCajaPreview(d.preview); setCajaCierres(d.cierres || []); }
        }).catch(() => {}).finally(() => setCajaLoading(false));
    }, [tab, staffSubTab, isStaffAlumno, cajaPreview]);

    const toggleCajaCierre = (id: string) => {
        if (cajaAbierto === id) { setCajaAbierto(null); return; }
        setCajaAbierto(id);
        if (cajaDetalles[id]) return;
        setCajaDetalleLoading(id);
        fetch(`/api/alumno/staff/caja/${id}`).then(r => r.json()).then(d => {
            if (d.ok) setCajaDetalles(prev => ({ ...prev, [id]: d.detalle }));
        }).catch(() => {}).finally(() => setCajaDetalleLoading(null));
    };

    const now = new Date();
    const [asistWeekOffset, setAsistWeekOffset] = useState(0);
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    async function fetchAlumno() {
        const r = await fetch('/api/alumno/me');
        const data = await r.json();
        setAlumno(data);
        return data as Alumno;
    }
    async function fetchPlan(alumnoId: string, alumnoData?: Alumno) {
        setLoadingPlan(true);
        try {
            const r = await fetch(`/api/plan-alumno/alumno/${alumnoId}`);
            const data: PlanEjAsignado | null = r.ok ? await r.json() : null;
            setPlanEj(data);
            if (data?.fechaInicio) {
                const inicio = new Date(data.fechaInicio);
                const totalSemanas = data.totalSemanas || 5;
                if (alumnoData && data.dias.length > 0) {
                    const diasLen = data.dias.length;
                    const sortedSessions = alumnoData.asistencia
                        .filter(a => a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= inicio)
                        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                    const totalDone = sortedSessions.length;
                    const lastSession = sortedSessions[sortedSessions.length - 1];
                    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
                    const justAttended = lastSession && new Date(lastSession.fecha).getTime() > threeHoursAgo;
                    const effectiveDone = justAttended ? totalDone - 1 : totalDone;
                    const currentDayIdx = diasLen > 0 ? effectiveDone % diasLen : 0;
                    const currentWeek = diasLen > 0 ? Math.floor(effectiveDone / diasLen) + 1 : 1;
                    setSelectedDia(currentDayIdx);
                    setSelectedSemana(Math.min(currentWeek, totalSemanas));
                } else {
                    const diasTranscurridos = Math.floor((Date.now() - inicio.getTime()) / (1000*60*60*24));
                    setSelectedSemana(Math.min(Math.max(Math.floor(diasTranscurridos/7)+1, 1), totalSemanas));
                }
            }
        } finally { setLoadingPlan(false); }
    }
    async function handleSaveEjercicio(ejIdx: number) {
        if (!planEj || !alumno) return;
        setSavingEj(ejIdx);
        try {
            const res = await fetch(`/api/plan-alumno/alumno/${alumno._id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: planEj._id, dias: planEj.dias }),
            });
            if (res.ok) setExpandedEj(null);
        } finally { setSavingEj(null); }
    }
    async function handleCheckIn() {
        setCheckingIn(true); setCheckInResult(null);
        try {
            const res = await fetch('/api/alumno/check-in', { method: 'POST' });
            if (res.ok) {
                setCheckInResult('ok'); fetchAlumno().catch(()=>{});
                setTimeout(() => setCheckInResult(null), 4000);
            } else {
                const data = await res.json().catch(()=>({}));
                setCheckInResult(data.error?.includes('Ya registraste') ? 'duplicate' : 'error');
                setTimeout(() => setCheckInResult(null), 4000);
            }
        } catch { setCheckInResult('error'); setTimeout(()=>setCheckInResult(null),4000); }
        finally { setCheckingIn(false); }
    }
    async function handlePagarMercadoPago() {
        setLoadingPago(true);
        try {
            const res = await fetch('/api/pagos/mp/crear-preferencia', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) { setPagoResult('error'); return; }
            if (data.alumnoId) sessionStorage.setItem('mp_alumno_id', data.alumnoId);
            const a = document.createElement('a'); a.href = data.init_point; a.target = '_blank'; a.rel = 'noopener noreferrer';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch { setPagoResult('error'); } finally { setLoadingPago(false); }
    }
    function updateEjAlumno(eIdx: number, field: string, value: string) {
        setPlanEj(prev => {
            if (!prev) return prev;
            const dias = prev.dias.map((d, di) => {
                if (di !== selectedDia) return d;
                const targetCombo = d.ejercicios[eIdx]?.grupoCombo;
                const isKgField = field.startsWith('kgAlumno');
                return { ...d, ejercicios: d.ejercicios.map((e, ei) => {
                    if (ei === eIdx) return { ...e, [field]: value };
                    if (isKgField && targetCombo && e.grupoCombo === targetCombo) return { ...e, [field]: value };
                    return e;
                })};
            });
            return { ...prev, dias };
        });
    }
    function getSemanaField(ej: EjercicioAsignado, sem: number): string {
        const map: Record<number, keyof EjercicioAsignado> = { 1:'semana1',2:'semana2',3:'semana3',4:'semana4',5:'semana5',6:'semana6',7:'semana7' };
        return (ej[map[sem]] as string) || '';
    }
    function getTrepadaField(ej: EjercicioAsignado, sem: number): string {
        const map: Record<number, keyof EjercicioAsignado> = { 1:'trepada1',2:'trepada2',3:'trepada3',4:'trepada4',5:'trepada5',6:'trepada6',7:'trepada7' };
        return (ej[map[sem]] as string) || '';
    }
    function parseSeries(semVal: string): number {
        if (!semVal) return 1;
        const deMatch = semVal.match(/^(\d+)\s*de/i);
        if (deMatch) return Math.min(Math.max(parseInt(deMatch[1]),1),6);
        const seriesMatch = semVal.match(/^(\d+)\s*series/i);
        if (seriesMatch) return Math.min(Math.max(parseInt(seriesMatch[1]),1),6);
        if (/^\d+(\.\d+)+$/.test(semVal)) return Math.min(semVal.split('.').length,6);
        if (semVal.includes('/')) return Math.min(semVal.split('/').length,6);
        const xMatch = semVal.match(/^(\d+)\s*[xX]/);
        if (xMatch) return Math.min(Math.max(parseInt(xMatch[1]),1),6);
        return 1;
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pago = params.get('pago'); const paymentId = params.get('payment_id');
        if (pago === 'ok' || pago === 'error' || pago === 'pendiente') {
            setPagoResult(pago as any); window.history.replaceState({}, '', '/mi-cuenta');
            if (pago === 'ok' && paymentId) {
                fetch(`/api/pagos/mp/verificar?payment_id=${paymentId}`).then(r=>r.json())
                    .then(data => { if (data.ok) fetchAlumno().catch(()=>{}); }).catch(()=>{});
            }
        }
        const alumnoPromise = fetchAlumno().then(data => { if (data?._id) fetchPlan(data._id, data); }).catch(()=>{});
        const temaPromise = fetch('/api/gimnasio/tema').then(r=>r.json()).then(d=>{ if (d.temaAcento) setAcento(d.temaAcento); }).catch(()=>{});
        Promise.all([alumnoPromise, temaPromise]).finally(()=>setLoading(false));
        fetch('/api/gimnasio/alias').then(r=>r.json()).then(d=>setAliasGimnasio(d.alias??'')).catch(()=>{});
        fetch('/api/tarifas').then(r=>r.json()).then(d=>{ if (d.ok) setTarifas((d.tarifas||[]).slice().sort((a:any,b:any)=>a.dias-b.dias)); }).catch(()=>{});
        const onVisible = () => { if (document.visibilityState==='visible') fetchAlumno().catch(()=>{}); };
        const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) fetchAlumno().catch(()=>{}); };
        const onFocus = () => fetchAlumno().catch(()=>{});
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('focus', onFocus);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] pb-24">
                {/* Hero skeleton */}
                <div className="mx-4 mt-4 rounded-[2rem] p-[1.5px]" style={{ background: 'linear-gradient(135deg, #10b981 0%, #f97316 100%)' }}>
                    <div className="bg-[#111] rounded-[30px] p-5 overflow-hidden relative">
                        <div className="absolute inset-0" style={{ backgroundImage:'radial-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize:'20px 20px' }} />
                        <div className="relative flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.08] animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-36 bg-white/[0.08] rounded-lg animate-pulse" />
                                <div className="h-6 w-28 bg-white/[0.06] rounded-full animate-pulse" />
                            </div>
                        </div>
                        <div className="relative flex gap-1.5 mt-4 pt-4 border-t border-white/[0.08]">
                            <div className="flex-1 h-10 bg-white/[0.07] rounded-xl animate-pulse" />
                            <div className="flex-1 h-10 bg-white/[0.07] rounded-xl animate-pulse" />
                            <div className="flex-1 h-10 bg-white/[0.07] rounded-xl animate-pulse" />
                        </div>
                    </div>
                </div>
                {/* Cards skeleton */}
                <div className="px-4 pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl h-40 animate-pulse" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }} />
                        <div className="rounded-2xl h-40 animate-pulse" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }} />
                    </div>
                    <div className="rounded-2xl h-16 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div className="rounded-2xl h-48 animate-pulse" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }} />
                </div>
            </div>
        );
    }
    if (!alumno) {
        return <div className="text-gray-400 text-center py-16 text-sm">Error al cargar tus datos.</div>;
    }

    // ── Derived data ──────────────────────────────────────────────────────────
    const mesActual = MESES[now.getMonth()];
    const anioActual = now.getFullYear();
    const asistenciasMap: Record<string, Asistencia[]> = {};
    alumno.asistencia.filter(a => a.presente).forEach(a => {
        const key = toLocalDateKey(a.fecha);
        if (!asistenciasMap[key]) asistenciasMap[key] = [];
        asistenciasMap[key].push(a);
    });
    const pagosMap: Record<string, Pago[]> = {};
    alumno.pagos.forEach(p => {
        const key = toLocalDateKey(p.fechaPago);
        if (!pagosMap[key]) pagosMap[key] = [];
        pagosMap[key].push(p);
    });
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const planDaysMap: Record<string, 'active'|'completed'> = {};
    const planBoundaryMap: Record<string, 'start'|'end'> = {};

    const embStartTs = alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado ? new Date(alumno.planEntrenamiento.fechaInicio).getTime() : 0;
    const ejStartTs = planEj?.fechaInicio ? new Date(planEj.fechaInicio).getTime() : 0;
    const useEjPlan = ejStartTs > embStartTs;

    if (alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado && !useEjPlan) {
        const startStr = planDateToKey(alumno.planEntrenamiento.fechaInicio);
        planBoundaryMap[startStr] = 'start';
        const cur = new Date(startStr + 'T12:00:00');
        const today = new Date(todayKey + 'T12:00:00');
        while (cur <= today) {
            const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
            planDaysMap[k] = 'active'; cur.setDate(cur.getDate()+1);
        }
    } else if (planEj?.fechaInicio) {
        if (alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado && useEjPlan) {
            const oldStart = planDateToKey(alumno.planEntrenamiento.fechaInicio);
            const oldStartDate = new Date(oldStart + 'T12:00:00');
            const duracion = alumno.planEntrenamiento.duracion || 0;
            const sesiones = alumno.asistencia
                .filter((a: Asistencia) => a.actividad==='Musculación' && a.presente && new Date(a.fecha)>=oldStartDate)
                .sort((a: Asistencia, b: Asistencia) => new Date(a.fecha).getTime()-new Date(b.fecha).getTime());
            const endSession = duracion>0 && sesiones.length>=duracion ? sesiones[duracion-1] : sesiones[sesiones.length-1];
            const oldEndStr = endSession ? toLocalDateKey(endSession.fecha) : (() => {
                const d = new Date(planDateToKey(planEj.fechaInicio!) + 'T12:00:00'); d.setDate(d.getDate()-1);
                return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            })();
            planBoundaryMap[oldStart] = 'start'; planBoundaryMap[oldEndStr] = 'end';
            const cur = new Date(oldStart + 'T12:00:00');
            const endDate = new Date(oldEndStr + 'T12:00:00');
            while (cur <= endDate) {
                const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
                planDaysMap[k] = 'completed'; cur.setDate(cur.getDate()+1);
            }
        }
    }
    for (const plan of (alumno.planEntrenamientoHistorial || [])) {
        if (!plan.fechaInicio || !plan.fechaFin) continue;
        const startStr = planDateToKey(plan.fechaInicio); const endStr = planDateToKey(plan.fechaFin);
        planBoundaryMap[startStr] = 'start'; planBoundaryMap[endStr] = 'end';
        const cur = new Date(startStr + 'T12:00:00'); const pe = new Date(endStr + 'T12:00:00');
        while (cur <= pe) {
            const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
            if (!planDaysMap[k]) planDaysMap[k] = 'completed'; cur.setDate(cur.getDate()+1);
        }
    }

    const asistenciasEsteMes = alumno.asistencia.filter(a => {
        const f = new Date(a.fecha);
        return a.presente && f.getMonth()===now.getMonth() && f.getFullYear()===anioActual;
    });
    const pagoEsteMes = pagoVigente(alumno.pagos, mesActual);
    const exenta = !!alumno.exentoCuota;
    const plan = alumno.planEntrenamiento;
    const tienePlan = plan?.fechaInicio && !plan?.terminado;
    let asistenciasEnPlan = 0;
    if (tienePlan && plan.fechaInicio) {
        const fechaInicio = new Date(plan.fechaInicio);
        asistenciasEnPlan = alumno.asistencia.filter(a => a.actividad==='Musculación' && a.presente && new Date(a.fecha)>=fechaInicio).length;
    }

    const planEjFechaInicio: Date | null = (() => {
        if (!planEj?.fechaInicio) return null;
        const s = planEj.fechaInicio.split('T')[0];
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m-1, d);
    })();
    const planEjTotal = planEj ? (planEj.dias?.length||0) * (planEj.totalSemanas||1) : 0;
    const planEjDone = planEjFechaInicio
        ? alumno.asistencia.filter(a => a.actividad==='Musculación' && a.presente && new Date(a.fecha)>=planEjFechaInicio).length
        : 0;
    const planEjComplete = planEj!=null && planEjTotal>0 && planEjFechaInicio!=null && planEjDone>=planEjTotal;

    const initials = getInitials(alumno.nombre, alumno.apellido);
    const gimnasioNombre = (alumno.gimnasioId as any)?.nombre ?? '';
    const calDays = getCalendarDays(calYear, calMonth);
    const selectedAsistencias = selectedDay ? (asistenciasMap[selectedDay] || []) : [];
    const selectedPagos = selectedDay ? (pagosMap[selectedDay] || []) : [];

    const daysInCurrentMonth = new Date(anioActual, now.getMonth()+1, 0).getDate();
    const monthAsistBars = Array.from({ length: daysInCurrentMonth }, (_, i) => {
        const dayKey = `${anioActual}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
        return (asistenciasMap[dayKey] || []).length;
    });

    function prevMonth() { setSelectedDay(null); if (calMonth===0) { setCalMonth(11); setCalYear(y=>y-1); } else setCalMonth(m=>m-1); }
    function nextMonth() { setSelectedDay(null); if (calMonth===11) { setCalMonth(0); setCalYear(y=>y+1); } else setCalMonth(m=>m+1); }

    // Bottom nav tabs config
    const TABS = [
        { key: 'resumen' as Tab, label: 'Resumen', icon: <ChartBar size={18} /> },
        { key: 'historial' as Tab, label: 'Historial', icon: <Clock3 size={18} /> },
        { key: 'plan' as Tab, label: 'Mi Plan', icon: <Dumbbell size={18} /> },
        ...(isStaffAlumno ? [{ key: 'staff' as Tab, label: 'Alumnos', icon: <Users size={18} /> }] : []),
    ];

    const handleVerPrecios = () => {
        const filas = tarifas.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
                <span style="color:rgba(255,255,255,0.7);font-size:0.9rem;">${t.dias === 1 ? 'Precio de una sesión' : `${t.dias} días por semana`}</span>
                <span style="color:#fbbf24;font-weight:700;font-size:0.9rem;">$${t.valor.toLocaleString('es-AR')}</span>
            </div>`).join('');
        Swal.fire({
            ...swalBase,
            title: 'Precios de cuotas',
            html: `<div style="text-align:left;">${filas}</div>`,
            confirmButtonText: 'Cerrar',
        });
    };

    const handleAjustesPerfil = async () => {
        const { value: nuevoEmail } = await Swal.fire({
            ...swalBase,
            title: 'Ajustes de perfil',
            html: `<p style="text-align:center;color:rgba(255,255,255,0.6);font-size:0.85rem;margin:0 0 1rem;">Este email se usa para recuperar tu contraseña si la olvidás.</p>`,
            input: 'email',
            inputLabel: 'Email',
            inputValue: alumno.email || '',
            inputPlaceholder: 'tu@email.com',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            inputValidator: (v) => !v?.trim() ? 'Ingresá un email' : null,
        });
        if (!nuevoEmail) return;
        try {
            const res = await fetch('/api/alumno/perfil', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: nuevoEmail.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setAlumno(prev => prev ? { ...prev, email: data.email } : prev);
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Email actualizado' });
            } else {
                Swal.fire({ ...swalNotify, icon: 'error', title: data.error || 'No se pudo guardar el email' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error de conexión' });
        }
    };

    const handleAvatarTap = () => {
        if (!isWatcher) return;
        avatarTapCount.current += 1;
        if (avatarTapResetTimer.current) clearTimeout(avatarTapResetTimer.current);
        if (avatarTapCount.current >= 5) {
            avatarTapCount.current = 0;
            changeTab('avisos');
            return;
        }
        avatarTapResetTimer.current = setTimeout(() => { avatarTapCount.current = 0; }, 1500);
    };

    const toggleVigilancia = async (targetId: string) => {
        setVigToggling(targetId);
        try {
            const res = await fetch('/api/alumno/vigilancia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alumnoId: targetId }),
            });
            const d = await res.json();
            if (d.ok) {
                setVigWatching(prev => {
                    const next = new Set(prev);
                    if (d.watching) next.add(targetId); else next.delete(targetId);
                    return next;
                });
            }
        } catch {}
        setVigToggling(null);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <div className="pb-10">

                {/* ── HERO BANNER ─────────────────────────────────────────── */}
                <div className="mx-4 mt-4 rounded-[2rem] p-[1.5px]" style={{ background: 'linear-gradient(135deg, #10b981 0%, #f97316 100%)', boxShadow: '0 0 30px -9px rgba(16,185,129,0.3), 0 0 40px -14px rgba(249,115,22,0.22)' }}>
                <div className="relative bg-[#111] overflow-hidden rounded-[30px]">
                    {/* Dot grid */}
                    <div className="absolute inset-0" style={{ backgroundImage:'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize:'20px 20px' }} />
                    {/* Glow accents */}
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-25" style={{ background: '#10b981' }} />
                    <div className="absolute -bottom-6 -left-4 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: '#f97316' }} />

                    <div className="relative px-5 pt-5 pb-5">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <BlurFade delay={0}>
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl select-none"
                                        style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}
                                        onClick={handleAvatarTap}>
                                        <span className="text-white font-bold text-2xl tracking-wide">{initials}</span>
                                    </div>
                                    {/* Status dot */}
                                    <span className={cn(
                                        'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center',
                                        (pagoEsteMes || exenta) ? 'bg-lime-400' : 'bg-red-500',
                                    )}>
                                        {(pagoEsteMes || exenta)
                                            ? <Check size={10} className="text-black font-bold" />
                                            : <span className="text-white text-[8px] font-black">!</span>
                                        }
                                    </span>
                                </div>
                            </BlurFade>

                            {/* Name + info */}
                            <BlurFade delay={0.08} className="flex-1 min-w-0">
                                <h1 className="text-white font-bold text-xl leading-tight truncate">
                                    {alumno.nombre} {alumno.apellido}
                                </h1>
                                <div className="mt-2">
                                    <span className={cn(
                                        'inline-block text-sm font-bold px-3 py-1 rounded-full tabular-nums',
                                        exenta
                                            ? 'bg-white/[0.08] text-slate-300 border border-white/[0.12]'
                                            : pagoEsteMes
                                                ? 'bg-lime-400/15 text-lime-400 border border-lime-400/20'
                                                : 'bg-red-500/15 text-red-400 border border-red-500/20',
                                    )}>
                                        {exenta ? 'Sin cuota' : pagoEsteMes ? `✓ Pagó $${pagoEsteMes.tarifa.toLocaleString('es-AR')}` : '✗ Debe la cuota'}
                                    </span>
                                    {tarifas.length > 0 && (
                                        <button onClick={handleVerPrecios} className="block mt-1.5 text-xs font-semibold text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">
                                            Ver cuotas
                                        </button>
                                    )}
                                </div>
                            </BlurFade>

                            <button onClick={handleAjustesPerfil} aria-label="Ajustes de perfil"
                                className="self-start w-9 h-9 shrink-0 rounded-xl bg-white/[0.07] border border-white/[0.1] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] transition-all">
                                <Settings size={16} />
                            </button>
                        </div>

                        {/* ── TAB SELECTOR ── */}
                        <BlurFade delay={0.16}>
                            <div className={cn(
                                'mt-4 pt-4 border-t border-white/[0.08] gap-1.5',
                                TABS.length > 3 ? 'grid grid-cols-2' : 'flex',
                            )}>
                                {TABS.map(t => {
                                    const isActive = tab === t.key;
                                    return (
                                        <button key={t.key} onClick={() => changeTab(t.key)}
                                            className={cn(
                                                'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all border whitespace-nowrap',
                                                isActive
                                                    ? 'bg-white text-black border-white shadow-md'
                                                    : 'bg-white/[0.07] text-white/70 border-white/[0.12] hover:bg-white/[0.12] hover:text-white',
                                            )}>
                                            <span className={isActive ? 'text-emerald-600' : ''}>{t.icon}</span>
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </BlurFade>
                    </div>
                </div>
                </div>

                {/* Content area */}
                <div className="px-4 pt-4 space-y-3">

                    {/* Pago result banner */}
                    {pagoResult && (
                        <BlurFade delay={0}>
                            <div className={cn('rounded-2xl px-4 py-3 flex items-center gap-3 border', {
                                'bg-lime-50 border-lime-200': pagoResult==='ok',
                                'bg-amber-50 border-amber-200': pagoResult==='pendiente',
                                'bg-red-50 border-red-200': pagoResult==='error',
                            })}>
                                <div className="shrink-0">
                                    {pagoResult==='ok' && <CheckCircle2 size={20} className="text-lime-600" />}
                                    {pagoResult==='pendiente' && <Clock3 size={20} className="text-amber-600" />}
                                    {pagoResult==='error' && <XCircle size={20} className="text-red-500" />}
                                </div>
                                <div className="flex-1">
                                    <p className={cn('text-sm font-bold', { 'text-lime-700':pagoResult==='ok','text-amber-700':pagoResult==='pendiente','text-red-700':pagoResult==='error' })}>
                                        {pagoResult==='ok' ? '¡Pago recibido!' : pagoResult==='pendiente' ? 'Pago en proceso' : 'El pago no se completó'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {pagoResult==='ok' ? 'Tu cuota quedó registrada. ¡Gracias!'
                                            : pagoResult==='pendiente' ? 'Tu pago está siendo procesado.'
                                            : 'Podés intentarlo de nuevo cuando quieras.'}
                                    </p>
                                </div>
                                <button onClick={()=>setPagoResult(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                    <XCircle size={16} />
                                </button>
                            </div>
                        </BlurFade>
                    )}

                    {/* ── RESUMEN ─────────────────────────────────────────── */}
                    {tab === 'resumen' && (
                        <div className="space-y-4">

                            {/* Plan activo + Asistencias mes — side by side */}
                            <div className="grid grid-cols-2 gap-3">

                                {/* Plan progress card */}
                                {(planEj && !planEjComplete) && (
                                    <BlurFade delay={0.05}>
                                        <div onClick={()=>changeTab('plan')}
                                            className="relative rounded-2xl p-4 h-full flex flex-col overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                                            style={{ background: 'linear-gradient(165deg, rgba(16,185,129,0.09), rgba(17,17,17,0.9))', border: '1px solid rgba(16,185,129,0.32)', boxShadow: '0 0 0 1px rgba(16,185,129,0.05) inset, 0 10px 26px -9px rgba(16,185,129,0.34)' }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #84cc16)' }}>
                                                    <Dumbbell size={16} className="text-white" />
                                                </div>
                                                <p className="text-xs font-bold text-white uppercase tracking-wide">Plan activo</p>
                                            </div>
                                            <p className="text-white font-bold text-base leading-snug truncate">{planEj.nombre}</p>
                                            <div className="flex items-end gap-1.5 mb-3 mt-2">
                                                <p className="font-black text-4xl leading-none tabular-nums text-white">
                                                    <NumberTicker value={planEjDone} />
                                                </p>
                                                <span className="text-white/20 font-bold text-3xl leading-none pb-px">/</span>
                                                <p className="text-white/50 font-black text-4xl leading-none tabular-nums">{planEjTotal}</p>
                                            </div>
                                            <p className="text-white/40 text-xs font-semibold -mt-2 mb-3">días de plan</p>
                                            <div className="mt-auto">
                                                <AnimatedProgress pct={(planEjDone / (planEjTotal||1)) * 100} color="bg-lime-400" trackColor="bg-white/10" />
                                            </div>
                                        </div>
                                    </BlurFade>
                                )}

                                {(!planEj && tienePlan) && (
                                    <BlurFade delay={0.05}>
                                        <div onClick={()=>changeTab('historial')}
                                            className="relative rounded-2xl p-4 h-full flex flex-col overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                                            style={{ background: 'linear-gradient(165deg, rgba(16,185,129,0.09), rgba(17,17,17,0.9))', border: '1px solid rgba(16,185,129,0.32)', boxShadow: '0 0 0 1px rgba(16,185,129,0.05) inset, 0 10px 26px -9px rgba(16,185,129,0.34)' }}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #84cc16)' }}>
                                                    <Dumbbell size={16} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white uppercase tracking-wide">Plan activo</p>
                                                    <p className="text-white/55 text-[11px] font-semibold">Musculación</p>
                                                </div>
                                            </div>
                                            <div className="flex items-end gap-1.5 mb-3">
                                                <p className="text-white font-black text-4xl leading-none tabular-nums">
                                                    <NumberTicker value={asistenciasEnPlan} />
                                                </p>
                                                <span className="text-white/20 font-bold text-3xl leading-none pb-px">/</span>
                                                <p className="text-white/50 font-black text-4xl leading-none tabular-nums">{plan.duracion}</p>
                                            </div>
                                            <p className="text-white/40 text-xs font-semibold -mt-2 mb-3">días de plan</p>
                                            <div className="mt-auto">
                                                <AnimatedProgress pct={(asistenciasEnPlan/(plan.duracion||1))*100} color="bg-lime-400" trackColor="bg-white/10" />
                                            </div>
                                        </div>
                                    </BlurFade>
                                )}

                                {/* Asistencias este mes */}
                                <BlurFade delay={0.15}>
                                    <div className="relative rounded-2xl p-4 h-full flex flex-col overflow-hidden"
                                        style={{ background: `linear-gradient(165deg, ${acento}16, rgba(17,17,17,0.9))`, border: `1px solid ${acento}4D`, boxShadow: `0 0 0 1px ${acento}0D inset, 0 10px 26px -9px ${acento}52` }}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${acento}, #fb923c)` }}>
                                                <CalendarCheck size={16} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white uppercase tracking-wide">Asistencias</p>
                                                <p className="text-white/55 text-[11px] font-semibold capitalize">{mesActual}</p>
                                            </div>
                                        </div>
                                        <p className="text-white font-black text-4xl leading-none tabular-nums mb-auto">
                                            <NumberTicker value={asistenciasEsteMes.length} />
                                        </p>
                                        {/* Mini bar chart */}
                                        <div className="flex items-end gap-[2px] h-8 mt-3">
                                            {monthAsistBars.map((count, i) => (
                                                <motion.div key={i} className="flex-1 rounded-sm"
                                                    style={{ backgroundColor: count > 0 ? acento : 'rgba(255,255,255,0.22)' }}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: count > 0 ? '100%' : '30%' }}
                                                    transition={{ duration: 0.4, delay: 0.3 + i * 0.015, ease: 'easeOut' }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </BlurFade>

                            </div>

                            {/* Plan completado */}
                            {(planEjComplete || (!planEj && plan?.terminado)) && (
                                <BlurFade delay={0.05}>
                                    <div className="rounded-2xl p-4 flex items-center gap-4"
                                        style={{ background: 'linear-gradient(165deg, rgba(163,230,53,0.09), rgba(17,17,17,0.9))', border: '1px solid rgba(163,230,53,0.32)', boxShadow: '0 10px 26px -9px rgba(163,230,53,0.3)' }}>
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #84cc16)' }}>
                                            <Trophy size={22} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-lime-300 font-bold text-sm">¡Plan completado!</p>
                                            <p className="text-white/40 text-xs mt-0.5">Completaste todas las sesiones del plan.</p>
                                        </div>
                                    </div>
                                </BlurFade>
                            )}

                            {/* Cuota pendiente + pago */}
                            {!pagoEsteMes && !exenta && aliasGimnasio && (
                                <BlurFade delay={0.1}>
                                    <div className="rounded-2xl overflow-hidden"
                                        style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div className="px-4 py-4">
                                            <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">Transferí tu cuota</p>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-white font-bold text-lg truncate">{aliasGimnasio}</span>
                                                <button onClick={()=>{ navigator.clipboard.writeText(aliasGimnasio); setAliasCopied(true); setTimeout(()=>setAliasCopied(false),2000); }}
                                                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition text-white/70 text-sm font-semibold">
                                                    {aliasCopied ? <><Check size={15} className="text-lime-400" /><span className="text-lime-400">Copiado</span></> : <><Copy size={15} />Copiar</>}
                                                </button>
                                            </div>
                                        </div>
                                        <a href="https://www.mercadopago.com.ar" target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 py-3.5 bg-[#009EE3] hover:bg-[#0088CC] transition-colors">
                                            <span className="text-white font-bold text-base">Abrir Mercado Pago</span>
                                            <ExternalLink size={17} className="text-white" />
                                        </a>
                                    </div>
                                </BlurFade>
                            )}

                            {/* Asistencias por semana */}
                            {(() => {
                                const hoy = new Date();
                                const dow = hoy.getDay();
                                const diffLunes = dow === 0 ? -6 : 1 - dow;
                                const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + diffLunes, 0, 0, 0, 0);
                                const diasSemana = Array.from({ length: 5 }, (_, i) => {
                                    const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
                                    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                    const asists = asistenciasMap[key] || [];
                                    return { d, key, asistencia: asists[0] || null };
                                });
                                return (
                                    <BlurFade delay={0.2}>
                                        <div className="relative rounded-2xl overflow-hidden"
                                            style={{ background: 'linear-gradient(165deg, rgba(14,165,233,0.09), rgba(17,17,17,0.9))', border: '1px solid rgba(14,165,233,0.32)', boxShadow: '0 0 0 1px rgba(14,165,233,0.05) inset, 0 10px 26px -9px rgba(14,165,233,0.3)' }}>
                                            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}>
                                                        <Clock3 size={14} className="text-white" />
                                                    </div>
                                                    <p className="font-bold text-xs text-white uppercase tracking-wide">Asistencias por semana</p>
                                                </div>
                                                <button onClick={()=>changeTab('historial')} className="flex items-center gap-1 text-sm font-semibold text-sky-400">
                                                    Ver todas <ChevronRight size={15} />
                                                </button>
                                            </div>
                                            <div className="divide-y divide-white/[0.06]">
                                                {diasSemana.map(({ d, key, asistencia: a }) => {
                                                    const color = a ? (ACTIVIDAD_COLOR[a.actividad] || '#6b7280') : null;
                                                    return (
                                                        <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                                                            <div className="w-20 shrink-0">
                                                                <p className={cn('font-bold text-sm leading-none capitalize', a ? 'text-white' : 'text-white/40')}>{d.toLocaleDateString('es-AR',{weekday:'long'})}</p>
                                                                <p className="text-white/40 text-xs font-semibold leading-none mt-1.5">{d.getDate()} {MESES_CORTO[d.getMonth()]}</p>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: a ? `${color}20` : 'rgba(255,255,255,0.05)' }}>
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a ? color! : 'rgba(255,255,255,0.15)' }} />
                                                            </div>
                                                            {a ? (
                                                                <>
                                                                    <p className="flex-1 text-white/80 font-semibold text-base truncate">{a.actividad}</p>
                                                                    <span className="text-white/40 text-sm font-medium tabular-nums">
                                                                        {new Date(a.fecha).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false})}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <div className="flex-1" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </BlurFade>
                                );
                            })()}

                        </div>
                    )}

                    {/* ── HISTORIAL ───────────────────────────────────────── */}
                    {tab === 'historial' && (
                        <div className="space-y-4">
                            <BlurFade delay={0.05}>
                                <div className="rounded-2xl p-5"
                                    style={{ background: `linear-gradient(165deg, ${acento}12, rgba(17,17,17,0.9))`, border: `1px solid ${acento}40`, boxShadow: `0 0 0 1px ${acento}0A inset, 0 10px 26px -9px ${acento}40` }}>
                                    <div className="flex items-center justify-between mb-6">
                                        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/60 transition-colors">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <span className="text-white font-bold text-lg capitalize">{MESES[calMonth]} {calYear}</span>
                                        <button onClick={nextMonth} disabled={calYear===now.getFullYear()&&calMonth===now.getMonth()}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/60 transition-colors disabled:opacity-25">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 mb-2">
                                        {DIAS_SEMANA.map(d => (
                                            <div key={d} className="flex items-center justify-center py-1">
                                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/[0.06] text-white text-xs font-bold">{d}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-1.5">
                                        {calDays.map((day, i) => {
                                            if (!day) return <div key={`e-${i}`} />;
                                            const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                            const asists = asistenciasMap[key] || [];
                                            const pagos = pagosMap[key] || [];
                                            const isToday = key === toLocalDateKey(now.toISOString());
                                            const isSelected = key === selectedDay;
                                            const hasData = asists.length>0 || pagos.length>0;
                                            const planDay = planDaysMap[key];
                                            const planBoundary = planBoundaryMap[key];
                                            return (
                                                <button key={key} onClick={()=>setSelectedDay(isSelected?null:key)}
                                                    className={cn('relative flex flex-col items-center py-2 rounded-xl transition-all', {
                                                        'bg-white/15': isSelected,
                                                        'bg-lime-400/10 hover:bg-lime-400/15': !isSelected && planDay==='active',
                                                        'bg-violet-400/10 hover:bg-violet-400/15': !isSelected && planDay==='completed',
                                                        'hover:bg-white/5': !isSelected && !planDay && hasData,
                                                        'cursor-default': !isSelected && !planDay && !hasData,
                                                    })}>
                                                    <span className={cn('text-sm font-semibold leading-none mb-1 w-8 h-8 flex items-center justify-center rounded-full', {
                                                        'bg-lime-400 text-black': isToday,
                                                        'bg-lime-500 text-white': !isToday && planBoundary==='start',
                                                        'bg-violet-500 text-white': !isToday && planBoundary==='end',
                                                        'text-white': !isToday && !planBoundary,
                                                    })}>
                                                        {day}
                                                    </span>
                                                    <div className="flex gap-0.5 flex-wrap justify-center max-w-[32px]">
                                                        {asists.map((a,idx) => <span key={idx} className={cn('w-2 h-2 rounded-full', ACTIVIDAD_DOT[a.actividad]||'bg-white/30')} />)}
                                                        {pagos.length>0 && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10 flex-wrap gap-y-2">
                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lime-400" /><span className="text-white text-xs">Musculación</span></div>
                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-white text-xs">Intermitente</span></div>
                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-white text-xs">Pago</span></div>
                                        {Object.values(planDaysMap).includes('active') && <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-lime-400/15 border border-lime-400/30" /><span className="text-white text-xs">Plan activo</span></div>}
                                        {Object.values(planDaysMap).includes('completed') && <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-violet-400/15 border border-violet-400/30" /><span className="text-white text-xs">Plan anterior</span></div>}
                                    </div>
                                </div>
                            </BlurFade>

                        </div>
                    )}

                    {/* ── MI PLAN ─────────────────────────────────────────── */}
                    {tab === 'plan' && (
                        <div className="space-y-3">
                            {loadingPlan && (
                                <div className="flex justify-center py-16">
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-lime-400 animate-spin" />
                                </div>
                            )}

                            {!loadingPlan && !planEj && (
                                <BlurFade delay={0.05}>
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Dumbbell size={28} className="text-slate-300" />
                                        </div>
                                        <p className="text-slate-700 font-semibold mb-1">Sin plan asignado</p>
                                        <p className="text-slate-400 text-sm">Tu entrenador todavía no te asignó un plan.</p>
                                    </div>
                                </BlurFade>
                            )}

                            {!loadingPlan && planEj && (() => {
                                const totalSem = planEj.totalSemanas || 5;
                                const dia = planEj.dias[selectedDia];
                                const totalSesiones = totalSem * planEj.dias.length;
                                const comboIdx: Record<string, number> = {};
                                let nextComboIdx = 0;
                                (dia?.ejercicios ?? []).forEach((e: EjercicioAsignado) => {
                                    if (e.grupoCombo && comboIdx[e.grupoCombo]===undefined) comboIdx[e.grupoCombo] = nextComboIdx++;
                                });
                                const planInicio = planEj.fechaInicio ? new Date(planEj.fechaInicio) : null;
                                const diasLen = planEj.dias.length;
                                const sortedSessionsR = (planInicio && alumno)
                                    ? alumno.asistencia.filter(a=>a.actividad==='Musculación'&&a.presente&&new Date(a.fecha)>=planInicio)
                                        .sort((a,b)=>new Date(a.fecha).getTime()-new Date(b.fecha).getTime())
                                    : [];
                                const totalDoneR = sortedSessionsR.length;
                                const lastSessionR = sortedSessionsR[sortedSessionsR.length-1];
                                const threeHoursAgoR = Date.now() - 3*60*60*1000;
                                const justAttendedR = lastSessionR && new Date(lastSessionR.fecha).getTime()>threeHoursAgoR;
                                const effectiveDoneR = justAttendedR ? totalDoneR-1 : totalDoneR;
                                const planComplete = diasLen>0 && effectiveDoneR>=totalSem*diasLen;
                                const currentDayIdx = planComplete ? diasLen : (diasLen>0 ? effectiveDoneR%diasLen : 0);
                                const sessionBasedWeekNum = planComplete ? totalSem+1 : Math.min(Math.floor(effectiveDoneR/diasLen)+1, totalSem);

                                return (
                                    <>
                                        <BlurFade delay={0.05}>
                                            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-4 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{planEj.categoria}</p>
                                                    <h2 className="text-slate-900 font-bold text-base truncate mt-0.5">{planEj.nombre}</h2>
                                                    <p className="text-slate-400 text-xs mt-0.5">{totalSesiones} sesiones · {totalSem} semanas</p>
                                                </div>
                                                <div className="shrink-0 text-center rounded-2xl px-3 py-2 bg-lime-50 border border-lime-100">
                                                    <p className="text-[9px] font-bold uppercase tracking-wide text-lime-600">Semana</p>
                                                    <p className="font-black text-2xl leading-none text-slate-900">{sessionBasedWeekNum}</p>
                                                    <p className="text-[10px] text-lime-600">de {totalSem}</p>
                                                </div>
                                            </div>
                                        </BlurFade>

                                        {planEj.entradaCalor?.ejercicios?.length>0 && (
                                            <BlurFade delay={0.08}>
                                                <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                                                    <button onClick={()=>setShowCalentamiento(v=>!v)}
                                                        className="w-full flex items-center justify-between gap-2 px-4 py-3.5 hover:bg-slate-50 transition active:bg-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <Flame size={16} className="text-orange-500" />
                                                            <span className="text-sm font-semibold text-slate-700">Entrada en calor</span>
                                                            <span className="text-xs text-slate-400">{planEj.entradaCalor.ejercicios.length} ej.</span>
                                                        </div>
                                                        <ChevronDown size={16} className={cn('text-slate-300 transition-transform', showCalentamiento && 'rotate-180')} />
                                                    </button>
                                                    {showCalentamiento && (
                                                        <div className="border-t border-slate-100 divide-y divide-slate-50">
                                                            {planEj.entradaCalor.ejercicios.map((e,i) => (
                                                                <div key={i} className="flex items-center justify-between px-4 py-3">
                                                                    <p className="text-sm font-medium text-slate-700">{e.nombre}</p>
                                                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">S/R</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </BlurFade>
                                        )}

                                        {/* Semana selector */}
                                        <BlurFade delay={0.1}>
                                            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Semana</p>
                                                <div className="flex gap-1.5">
                                                    {Array.from({length:totalSem},(_,i)=>i+1).map(sem => {
                                                        const isCurrent = sem===sessionBasedWeekNum;
                                                        const isSelected = sem===selectedSemana;
                                                        const isPast = sem<sessionBasedWeekNum;
                                                        return (
                                                            <button key={sem} onClick={()=>setSelectedSemana(sem)}
                                                                className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden', {
                                                                    'bg-lime-400 text-black shadow-sm': isSelected,
                                                                    'bg-slate-100 text-slate-400': !isSelected && isPast,
                                                                    'bg-slate-100 text-slate-500 hover:bg-slate-200': !isSelected && !isPast,
                                                                })}>
                                                                {sem===totalSem ? 'DESC' : sem}
                                                                {isPast && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-lime-400 flex items-center justify-center">
                                                                    <Check size={8} className="text-black font-bold" />
                                                                </span>}
                                                                {isCurrent && !isSelected && <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-lime-400" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {selectedSemana===totalSem && <p className="text-center text-xs text-slate-400 mt-2">Semana de descarga</p>}
                                            </div>
                                        </BlurFade>

                                        {/* Día selector */}
                                        <BlurFade delay={0.12}>
                                            <div className="flex gap-1.5">
                                                {planEj.dias.map((d,i) => {
                                                    const isDayDone = selectedSemana<sessionBasedWeekNum || (selectedSemana===sessionBasedWeekNum && i<currentDayIdx);
                                                    const isCurrentDay = selectedSemana===sessionBasedWeekNum && i===currentDayIdx;
                                                    return (
                                                        <button key={i} onClick={()=>{setSelectedDia(i);setExpandedEj(null);}}
                                                            className={cn('relative flex-1 h-14 flex flex-col items-center justify-center rounded-2xl transition-all border overflow-hidden', {
                                                                'bg-lime-400 text-black border-lime-400 shadow-sm': selectedDia===i,
                                                                'bg-white text-slate-500 border-slate-200 hover:border-slate-300': selectedDia!==i,
                                                            })}>
                                                            <span className="text-sm font-bold leading-none">{`Día ${i+1}`}</span>
                                                            {isDayDone && <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-lime-400 flex items-center justify-center">
                                                                <Check size={8} className="text-black" />
                                                            </span>}
                                                            {isCurrentDay && !isDayDone && selectedDia!==i && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-lime-400" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </BlurFade>

                                        {dia?.bloqueActivacion && (
                                            <BlurFade delay={0.14}>
                                                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                                                    <p className="text-xs font-bold text-amber-600 mb-1">Bloque de activación</p>
                                                    <p className="text-sm text-amber-700 leading-snug">{dia.bloqueActivacion}</p>
                                                </div>
                                            </BlurFade>
                                        )}

                                        {dia && (
                                            <BlurFade delay={0.16}>
                                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                                    <div className="grid grid-cols-[1fr_44px_76px_56px] border-b border-slate-100">
                                                        <div className="px-4 py-2.5"><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Ejercicio</p></div>
                                                        <div className="px-1 py-2.5 flex items-center justify-center border-l border-slate-100"><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">Trepada</p></div>
                                                        <div className="px-1 py-2.5 flex items-center justify-center border-l border-slate-100"><p className="text-[8px] font-bold text-slate-600 uppercase tracking-wide text-center leading-tight">Núcleo</p></div>
                                                        <div className="px-1 py-2.5 flex items-center justify-center border-l border-slate-100"><p className="text-[8px] font-bold text-lime-600 uppercase tracking-wide text-center leading-tight">Mis KG</p></div>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {dia.ejercicios.map((ej, eIdx) => {
                                                            const semVal = getSemanaField(ej, selectedSemana);
                                                            const trepadaVal = getTrepadaField(ej, selectedSemana);
                                                            const isExpanded = expandedEj===eIdx;
                                                            const ci = ej.grupoCombo ? (comboIdx[ej.grupoCombo]??-1) : -1;
                                                            const combo = ci>=0 ? COMBO_PALETTE[ci%COMBO_PALETTE.length] : null;
                                                            const prevEj = dia.ejercicios[eIdx-1];
                                                            const isFirstInCombo = combo && (!prevEj?.grupoCombo||prevEj.grupoCombo!==ej.grupoCombo);
                                                            return (
                                                                <div key={eIdx} style={combo?{backgroundColor:combo.bg}:undefined}>
                                                                    <button onClick={()=>setExpandedEj(isExpanded?null:eIdx)}
                                                                        className="w-full grid grid-cols-[1fr_44px_76px_56px] text-left hover:bg-slate-50 transition-colors active:bg-slate-100">
                                                                        <div className="px-4 py-3 flex items-center gap-2">
                                                                            <div className="flex-1 min-w-0">
                                                                                {isFirstInCombo && combo && (
                                                                                    <div className="flex items-center gap-1 mb-0.5">
                                                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor:combo.dotColor}} />
                                                                                        <span className="text-[10px] font-bold uppercase tracking-wide" style={{color:combo.labelColor}}>Combinado</span>
                                                                                    </div>
                                                                                )}
                                                                                <p className="text-sm font-semibold text-slate-900 leading-tight">{ej.nombre}</p>
                                                                                {ej.kg && ej.kg!=='-' && <p className="text-sm font-bold text-red-500 mt-0.5">{ej.kg} kg</p>}
                                                                                {(() => { const obs=(ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string)||''; return obs?<p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{obs}</p>:null; })()}
                                                                            </div>
                                                                            <ChevronDown size={14} className={cn('text-slate-300 shrink-0 transition-transform', isExpanded&&'rotate-180')} />
                                                                        </div>
                                                                        <div className="px-1 py-3 border-l border-slate-100 flex items-center justify-center">
                                                                            <span className={cn('text-sm font-bold text-center leading-tight', trepadaVal&&trepadaVal!=='-'?'text-slate-500':'text-slate-200')}>
                                                                                {trepadaVal&&trepadaVal!=='-'?trepadaVal:'—'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="px-2 py-3 border-l border-slate-100 flex items-center justify-center">
                                                                            <span className={cn('text-sm font-bold text-center leading-tight', semVal?'text-slate-800':'text-slate-200')}>{semVal||'—'}</span>
                                                                        </div>
                                                                        <div className="px-1 py-2 border-l border-slate-100 flex items-center justify-center">
                                                                            {(() => {
                                                                                const kgVal=(ej[`kgAlumno${selectedSemana}` as keyof EjercicioAsignado] as string)||'';
                                                                                const kgParts=kgVal?kgVal.split(',').map(v=>v.trim()).filter(Boolean):[];
                                                                                if (!kgParts.length) return <span className="text-xs font-bold text-slate-200">—</span>;
                                                                                if (kgParts.length===1) return <span className="text-sm font-bold text-lime-600">{kgParts[0]}</span>;
                                                                                return <div className="grid grid-cols-2 gap-x-0.5 gap-y-0.5 w-full">{kgParts.map((kg,i)=><span key={i} className="text-[10px] font-bold text-lime-400 text-center leading-tight">{kg}</span>)}</div>;
                                                                            })()}
                                                                        </div>
                                                                    </button>

                                                                    {isExpanded && (() => {
                                                                        const seriesCount = parseSeries(semVal);
                                                                        const kgRaw=(ej[`kgAlumno${selectedSemana}` as keyof EjercicioAsignado] as string)||'';
                                                                        const kgParts=kgRaw.split(',').map(v=>v.trim());
                                                                        while(kgParts.length<seriesCount) kgParts.push('');
                                                                        return (
                                                                            <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3">
                                                                                {ej.notas && <p className="text-xs text-slate-400 italic">{ej.notas}</p>}
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Trepada</label>
                                                                                        <input type="text" value={(ej[`trepada${selectedSemana}` as keyof EjercicioAsignado] as string)||''}
                                                                                            onChange={e=>updateEjAlumno(eIdx,`trepada${selectedSemana}`,e.target.value)}
                                                                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:border-lime-500 text-center" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Núcleo</label>
                                                                                        <input type="text" value={semVal} onChange={e=>updateEjAlumno(eIdx,`semana${selectedSemana}`,e.target.value)}
                                                                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:border-lime-500 text-center" />
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">
                                                                                        Mis KG{seriesCount>1&&<span className="normal-case font-normal"> · {seriesCount} series</span>}
                                                                                    </label>
                                                                                    <div className={cn('grid gap-2', seriesCount===1?'grid-cols-1':seriesCount<=4?`grid-cols-${seriesCount}`:'grid-cols-4')}>
                                                                                        {Array.from({length:seriesCount},(_,si)=>(
                                                                                            <div key={si} className="flex flex-col gap-0.5">
                                                                                                {seriesCount>1 && <span className="text-[10px] font-bold text-slate-400 text-center">S{si+1}</span>}
                                                                                                <input type="number" inputMode="decimal" placeholder="kg" value={kgParts[si]||''}
                                                                                                    onChange={e=>{ const np=[...kgParts]; np[si]=e.target.value; updateEjAlumno(eIdx,`kgAlumno${selectedSemana}`,np.join(',')); }}
                                                                                                    className="w-full border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-lime-500 text-center" />
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Observaciones</label>
                                                                                    <input type="text" value={(ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string)||''}
                                                                                        onChange={e=>updateEjAlumno(eIdx,`observacionesAlumno${selectedSemana}`,e.target.value)}
                                                                                        className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:border-lime-500" />
                                                                                </div>
                                                                                <button onClick={()=>handleSaveEjercicio(eIdx)} disabled={savingEj===eIdx}
                                                                                    className="w-full py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-60 bg-lime-400 text-black hover:bg-lime-300 active:bg-lime-500">
                                                                                    {savingEj===eIdx?'Guardando...':'Guardar'}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </BlurFade>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* ── AVISOS (oculto) ─────────────────────────────────── */}
                    {tab === 'avisos' && isWatcher && (() => {
                        const ARG = 3 * 60 * 60 * 1000;
                        const todayArg = (() => {
                            const arg = new Date(Date.now() - ARG);
                            return `${arg.getUTCFullYear()}-${String(arg.getUTCMonth()+1).padStart(2,'0')}-${String(arg.getUTCDate()).padStart(2,'0')}`;
                        })();
                        const slotOf = (h: number) => h < 12 ? 'Mañana' : h < 15 ? 'Siesta' : h < 20 ? 'Tarde' : 'Noche';
                        const SLOTS = ['Mañana', 'Siesta', 'Tarde', 'Noche'];
                        const hoyPorTurno: Record<string, { nombre: string; apellido: string; actividad: string; hora: string }[]> = { Mañana: [], Siesta: [], Tarde: [], Noche: [] };
                        for (const a of vigAlumnos) {
                            for (const asis of (a.asistencia || [])) {
                                if (!asis.presente) continue;
                                const d = new Date(asis.fecha);
                                const arg = new Date(d.getTime() - ARG);
                                const key = `${arg.getUTCFullYear()}-${String(arg.getUTCMonth()+1).padStart(2,'0')}-${String(arg.getUTCDate()).padStart(2,'0')}`;
                                if (key !== todayArg) continue;
                                const hh = arg.getUTCHours();
                                hoyPorTurno[slotOf(hh)].push({ nombre: a.nombre, apellido: a.apellido, actividad: asis.actividad, hora: `${String(hh).padStart(2,'0')}:${String(arg.getUTCMinutes()).padStart(2,'0')}` });
                            }
                        }
                        for (const s of SLOTS) hoyPorTurno[s].sort((a,b) => a.hora.localeCompare(b.hora));
                        const totalHoyVig = SLOTS.reduce((acc, s) => acc + hoyPorTurno[s].length, 0);

                        return (
                        <div className="space-y-3">
                            <BlurFade delay={0.05}>
                                <div className="bg-white/[0.08] rounded-2xl p-1 flex gap-1">
                                    {([
                                        { key: 'avisos' as const, icon: <Bell size={18} /> },
                                        { key: 'hoy' as const, icon: <Users size={18} /> },
                                    ]).map(s => (
                                        <button key={s.key} onClick={() => setVigSubTab(s.key)} aria-label={s.key}
                                            className={cn(
                                                'flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all',
                                                vigSubTab === s.key ? 'bg-white text-black' : 'text-white/60',
                                            )}>
                                            {s.icon}
                                        </button>
                                    ))}
                                </div>
                            </BlurFade>

                            {vigLoading ? (
                                <div className="flex justify-center py-16">
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                                </div>
                            ) : vigSubTab === 'avisos' ? (
                                <>
                                    <BlurFade delay={0.08}>
                                        <input
                                            type="text"
                                            value={vigSearch}
                                            onChange={e => setVigSearch(e.target.value)}
                                            placeholder="Buscar por nombre, apellido o DNI..."
                                            className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)] focus:outline-none focus:border-emerald-300"
                                        />
                                    </BlurFade>
                                    <BlurFade delay={0.1}>
                                        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)] divide-y divide-slate-100">
                                            {vigAlumnos
                                                .filter(a => {
                                                    const q = vigSearch.trim().toLowerCase();
                                                    if (!q) return true;
                                                    return `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) || a.dni.includes(q);
                                                })
                                                .map(a => {
                                                    const on = vigWatching.has(a._id);
                                                    return (
                                                        <button key={a._id} onClick={() => toggleVigilancia(a._id)} disabled={vigToggling === a._id}
                                                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors disabled:opacity-60">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                                                {getInitials(a.nombre, a.apellido)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-slate-900 font-semibold text-base truncate">{a.apellido}, {a.nombre}</p>
                                                                <p className="text-slate-400 text-sm">DNI {a.dni}</p>
                                                            </div>
                                                            <span className={cn(
                                                                'w-11 h-6 rounded-full shrink-0 relative transition-colors',
                                                                on ? 'bg-emerald-500' : 'bg-slate-200',
                                                            )}>
                                                                <span className={cn(
                                                                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                                                                    on ? 'left-[22px]' : 'left-0.5',
                                                                )} />
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            {vigAlumnos.length === 0 && (
                                                <p className="text-slate-400 text-sm text-center py-10">No hay alumnos.</p>
                                            )}
                                        </div>
                                    </BlurFade>
                                </>
                            ) : (
                                <BlurFade delay={0.08}>
                                    <div className="space-y-3">
                                        <p className="text-white/50 text-sm font-semibold">{totalHoyVig} {totalHoyVig === 1 ? 'persona vino' : 'personas vinieron'} hoy</p>
                                        {SLOTS.filter(s => hoyPorTurno[s].length > 0).map(slot => {
                                            const open = !!vigSlotsExpanded[slot];
                                            return (
                                                <div key={slot} className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)]">
                                                    <button onClick={() => setVigSlotsExpanded(prev => ({ ...prev, [slot]: !prev[slot] }))}
                                                        className="w-full flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                                                        <p className="font-bold text-slate-900 text-base">{slot}</p>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{hoyPorTurno[slot].length}</span>
                                                        <ChevronDown size={16} className={cn('ml-auto text-slate-300 transition-transform duration-200', open && 'rotate-180')} />
                                                    </button>
                                                    {open && (
                                                        <div className="divide-y divide-slate-100">
                                                            {hoyPorTurno[slot].map((a, i) => (
                                                                <div key={i} className="flex items-center gap-3 px-4 py-3">
                                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                                                        {getInitials(a.nombre, a.apellido)}
                                                                    </div>
                                                                    <p className="flex-1 text-slate-800 font-semibold text-sm truncate">{a.apellido}, {a.nombre}</p>
                                                                    <span className="text-slate-400 text-xs font-medium truncate max-w-[30%]">{a.actividad}</span>
                                                                    <span className="text-slate-900 text-sm font-bold tabular-nums">{a.hora}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {totalHoyVig === 0 && (
                                            <div className="bg-white border border-slate-300 rounded-2xl p-10 text-center shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)]">
                                                <p className="text-slate-400 text-sm">Todavía no vino nadie hoy.</p>
                                            </div>
                                        )}
                                    </div>
                                </BlurFade>
                            )}
                        </div>
                        );
                    })()}

                    {/* ── ALUMNOS (staff) ─────────────────────────────────── */}
                    {tab === 'staff' && isStaffAlumno && (() => {
                        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                        const mesActualStaff = MESES[now.getMonth()];
                        const q = normalize(staffSearch.trim());
                        const filtrados = staffAlumnos.filter(a => {
                            if (!q) return true;
                            return normalize(`${a.nombre} ${a.apellido}`).includes(q) || a.dni.includes(q);
                        });

                        const ARG = 3 * 60 * 60 * 1000;
                        const todayArg = (() => {
                            const arg = new Date(Date.now() - ARG);
                            return `${arg.getUTCFullYear()}-${String(arg.getUTCMonth()+1).padStart(2,'0')}-${String(arg.getUTCDate()).padStart(2,'0')}`;
                        })();
                        const slotOf = (h: number) => h < 12 ? 'Mañana' : h < 15 ? 'Siesta' : h < 20 ? 'Tarde' : 'Noche';
                        const SLOTS = ['Mañana', 'Siesta', 'Tarde', 'Noche'];
                        const hoyPorTurno: Record<string, { nombre: string; apellido: string; actividad: string; hora: string }[]> = { Mañana: [], Siesta: [], Tarde: [], Noche: [] };
                        for (const a of staffAlumnos) {
                            for (const asis of (a.asistencia || [])) {
                                if (!asis.presente) continue;
                                const d = new Date(asis.fecha);
                                const arg = new Date(d.getTime() - ARG);
                                const key = `${arg.getUTCFullYear()}-${String(arg.getUTCMonth()+1).padStart(2,'0')}-${String(arg.getUTCDate()).padStart(2,'0')}`;
                                if (key !== todayArg) continue;
                                const hh = arg.getUTCHours();
                                hoyPorTurno[slotOf(hh)].push({ nombre: a.nombre, apellido: a.apellido, actividad: asis.actividad, hora: `${String(hh).padStart(2,'0')}:${String(arg.getUTCMinutes()).padStart(2,'0')}` });
                            }
                        }
                        for (const s of SLOTS) hoyPorTurno[s].sort((a,b) => a.hora.localeCompare(b.hora));
                        const totalHoy = SLOTS.reduce((acc, s) => acc + hoyPorTurno[s].length, 0);

                        const refetchStaff = () => {
                            setStaffLoading(true);
                            fetch('/api/alumno/staff/alumnos').then(r => r.json()).then(d => {
                                if (d.ok) setStaffAlumnos(d.alumnos || []);
                            }).catch(() => {}).finally(() => setStaffLoading(false));
                        };

                        return (
                            <div className="space-y-3">
                                <BlurFade delay={0.05}>
                                    <div className="bg-white/[0.08] rounded-2xl p-1 flex gap-1">
                                        {([
                                            { key: 'lista' as const, label: 'Lista', icon: <Users size={15} /> },
                                            { key: 'hoy' as const, label: 'Hoy', icon: <Clock3 size={15} /> },
                                            { key: 'caja' as const, label: 'Caja', icon: <Wallet size={15} /> },
                                            { key: 'nuevo' as const, label: 'Nuevo', icon: <UserPlus size={15} /> },
                                        ]).map(s => (
                                            <button key={s.key} onClick={() => setStaffSubTab(s.key)}
                                                className={cn(
                                                    'flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                                                    staffSubTab === s.key ? 'bg-white text-black' : 'text-white/60',
                                                )}>
                                                {s.icon}{s.label}
                                            </button>
                                        ))}
                                    </div>
                                </BlurFade>

                                {staffLoading ? (
                                    <div className="flex justify-center py-16">
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                                    </div>
                                ) : staffSubTab === 'lista' ? (
                                    <>
                                        <BlurFade delay={0.08}>
                                            <div className="relative">
                                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                                                    placeholder="Buscar por nombre o DNI..."
                                                    className="w-full bg-white border border-slate-300 rounded-2xl pl-11 pr-4 py-3 text-base text-slate-900 placeholder:text-slate-400 shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)] focus:outline-none focus:border-emerald-300" />
                                            </div>
                                        </BlurFade>
                                        <BlurFade delay={0.1}>
                                            <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)] divide-y divide-slate-100">
                                                {filtrados.map(a => {
                                                    const pagado = estaAlDia({ pagos: a.pagos as any, exentoCuota: a.exentoCuota }, mesActualStaff);
                                                    return (
                                                        <div key={a._id} className="flex items-center gap-3 px-4 py-3.5">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                                                {getInitials(a.nombre, a.apellido)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-slate-900 font-semibold text-base truncate">{a.apellido}, {a.nombre}</p>
                                                                <p className="text-slate-400 text-sm">DNI {a.dni}</p>
                                                            </div>
                                                            <span className={cn(
                                                                'text-xs font-bold px-2.5 py-1 rounded-full shrink-0',
                                                                a.exentoCuota ? 'bg-slate-100 text-slate-500' : pagado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
                                                            )}>
                                                                {a.exentoCuota ? 'Exenta' : pagado ? 'Pagó' : 'Debe'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {filtrados.length === 0 && (
                                                    <p className="text-slate-400 text-sm text-center py-10">Sin resultados.</p>
                                                )}
                                            </div>
                                        </BlurFade>
                                    </>
                                ) : staffSubTab === 'hoy' ? (
                                    <BlurFade delay={0.08}>
                                        <div className="space-y-3">
                                            <p className="text-white/50 text-sm font-semibold">{totalHoy} {totalHoy === 1 ? 'persona vino' : 'personas vinieron'} hoy</p>
                                            {SLOTS.filter(s => hoyPorTurno[s].length > 0).map(slot => {
                                                const open = !!staffSlotsExpanded[slot];
                                                return (
                                                    <div key={slot} className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)]">
                                                        <button onClick={() => setStaffSlotsExpanded(prev => ({ ...prev, [slot]: !prev[slot] }))}
                                                            className="w-full flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                                                            <p className="font-bold text-slate-900 text-base">{slot}</p>
                                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{hoyPorTurno[slot].length}</span>
                                                            <ChevronDown size={16} className={cn('ml-auto text-slate-300 transition-transform duration-200', open && 'rotate-180')} />
                                                        </button>
                                                        {open && (
                                                            <div className="divide-y divide-slate-100">
                                                                {hoyPorTurno[slot].map((a, i) => (
                                                                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                                                                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                                                            {getInitials(a.nombre, a.apellido)}
                                                                        </div>
                                                                        <p className="flex-1 text-slate-800 font-semibold text-sm truncate">{a.apellido}, {a.nombre}</p>
                                                                        <span className="text-slate-400 text-xs font-medium truncate max-w-[30%]">{a.actividad}</span>
                                                                        <span className="text-slate-900 text-sm font-bold tabular-nums">{a.hora}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {totalHoy === 0 && (
                                                <div className="bg-white border border-slate-300 rounded-2xl p-10 text-center shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)]">
                                                    <p className="text-slate-400 text-sm">Todavía no vino nadie hoy.</p>
                                                </div>
                                            )}
                                        </div>
                                    </BlurFade>
                                ) : staffSubTab === 'caja' ? (
                                    cajaLoading ? (
                                        <div className="flex justify-center py-16">
                                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                                        </div>
                                    ) : !cajaPreview ? (
                                        <div className="bg-white border border-slate-300 rounded-2xl p-10 text-center shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)]">
                                            <p className="text-slate-400 text-sm">No se pudo cargar la caja.</p>
                                        </div>
                                    ) : (
                                        <BlurFade delay={0.08}>
                                            <div className="space-y-3">
                                                <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)]">
                                                    <p className="text-slate-400 text-xs font-semibold mb-3">
                                                        Desde {new Date(cajaPreview.fechaDesde).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} hasta {new Date(cajaPreview.fechaHasta).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2.5 mb-3">
                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                                                            <Banknote size={15} className="text-emerald-600 mb-1.5" />
                                                            <p className="text-slate-900 font-black text-lg tabular-nums leading-none">${cajaPreview.totalEfectivo.toLocaleString('es-AR')}</p>
                                                            <p className="text-emerald-700/70 text-[10px] font-bold uppercase tracking-wide mt-1">Efectivo</p>
                                                        </div>
                                                        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5">
                                                            <Landmark size={15} className="text-sky-600 mb-1.5" />
                                                            <p className="text-slate-900 font-black text-lg tabular-nums leading-none">${cajaPreview.totalTransferencia.toLocaleString('es-AR')}</p>
                                                            <p className="text-sky-700/70 text-[10px] font-bold uppercase tracking-wide mt-1">Transferencia</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                                        <span className="text-slate-500 text-sm">Total del turno</span>
                                                        <span className="text-slate-900 font-black text-base tabular-nums">${cajaPreview.totalGeneral.toLocaleString('es-AR')}</span>
                                                    </div>
                                                    <p className="text-slate-400 text-xs mt-1">{cajaPreview.cantidadPagos} {cajaPreview.cantidadPagos === 1 ? 'pago' : 'pagos'} registrados</p>
                                                </div>

                                                <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-[0_10px_34px_-6px_rgba(255,255,255,0.07)]">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide px-4 pt-4 pb-2">Mis cierres</p>
                                                    {cajaCierres.length === 0 ? (
                                                        <p className="text-slate-400 text-sm text-center py-8">Todavía no cerraste ninguna caja.</p>
                                                    ) : (
                                                        <div className="divide-y divide-slate-100">
                                                            {cajaCierres.map(c => {
                                                                const abierto = cajaAbierto === c._id;
                                                                const detalle = cajaDetalles[c._id];
                                                                return (
                                                                    <div key={c._id}>
                                                                        <button onClick={() => toggleCajaCierre(c._id)} className="w-full text-left px-4 py-3">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <p className="text-slate-800 text-sm font-semibold">
                                                                                    {new Date(c.fechaDesde).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} → {new Date(c.fechaHasta).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                                </p>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className="text-slate-900 font-bold text-sm tabular-nums">${c.totalGeneral.toLocaleString('es-AR')}</span>
                                                                                    <ChevronDown size={14} className={cn('text-slate-300 transition-transform duration-200', abierto && 'rotate-180')} />
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-slate-400 text-xs mt-1">{c.registradoPorNombre}</p>
                                                                        </button>
                                                                        {abierto && (
                                                                            <div className="px-4 pb-3">
                                                                                {cajaDetalleLoading === c._id ? (
                                                                                    <div className="flex justify-center py-4">
                                                                                        <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                                                                                    </div>
                                                                                ) : !detalle || detalle.length === 0 ? (
                                                                                    <p className="text-slate-400 text-xs text-center py-3">Sin pagos en este cierre.</p>
                                                                                ) : (
                                                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100">
                                                                                        {detalle.map((p, i) => (
                                                                                            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                                                                                                <p className="text-slate-700 text-sm truncate">{p.apellido}, {p.nombre}</p>
                                                                                                <span className="text-slate-500 text-xs tabular-nums shrink-0 capitalize">{p.metodoPago} · ${p.monto.toLocaleString('es-AR')}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </BlurFade>
                                    )
                                ) : (
                                    <BlurFade delay={0.08}>
                                        <AlumnoRegistroForm endpoint="/api/alumno/staff/alumnos" onSuccess={refetchStaff} />
                                    </BlurFade>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

        </div>
    );
}
