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
    const [actividadesRecepcion, setActividadesRecepcion] = useState<string[]>(['Musculación']);
    const [alumnosHoy, setAlumnosHoy] = useState<{ nombre: string; apellido: string; actividad: string; hora: string; id: string; pagado: boolean }[]>([]);
    const [alumnosDePasoHoy, setAlumnosDePasoHoy] = useState<{ nombre: string; apellido: string; actividad: string; hora: string }[]>([]);
    const [loadingHoy, setLoadingHoy] = useState(false);
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

    useEffect(() => {
        fetchDashboard();
    }, [session]);

    usePaymentEvents(fetchDashboard);

    const fetchAlumnosHoy = () => {
        if (!session || session.user?.role !== 'recepcion') return;
        setLoadingHoy(true);
        fetch('/api/alumnos')
            .then(r => r.json())
            .then(data => {
                const arg = new Date(Date.now() - 3 * 60 * 60 * 1000);
                const hoyKey = `${arg.getUTCFullYear()}-${String(arg.getUTCMonth()+1).padStart(2,'0')}-${String(arg.getUTCDate()).padStart(2,'0')}`;
                const hoy: typeof alumnosHoy = [];
                const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
                for (const al of (data || [])) {
                    const pagado = (al.pagos || []).some((p: any) => p.mes?.toLowerCase() === mesActual);
                    for (const a of (al.asistencia || [])) {
                        if (!a.presente) continue;
                        const d = new Date(a.fecha);
                        const da = new Date(d.getTime() - 3*60*60*1000);
                        const k = `${da.getUTCFullYear()}-${String(da.getUTCMonth()+1).padStart(2,'0')}-${String(da.getUTCDate()).padStart(2,'0')}`;
                        if (k !== hoyKey) continue;
                        const hh = da.getUTCHours();
                        const mm = da.getUTCMinutes();
                        hoy.push({ nombre: al.nombre, apellido: al.apellido, actividad: a.actividad ?? '', hora: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`, id: al._id, pagado });
                    }
                }
                hoy.sort((a, b) => b.hora.localeCompare(a.hora));
                setAlumnosHoy(hoy);
            })
            .catch(() => {})
            .finally(() => setLoadingHoy(false));
    };

    const fetchAlumnosDePasoHoy = () => {
        if (!session || !['recepcion', 'dueño', 'admin'].includes(session.user?.role ?? '')) return;
        fetch('/api/alumnos-de-paso?hoy=1')
            .then(r => r.json())
            .then(d => {
                if (!d.ok) return;
                const lista = (d.registros || []).map((r: any) => {
                    const fecha = new Date(r.fecha);
                    const argFecha = new Date(fecha.getTime() - 3 * 60 * 60 * 1000);
                    const hh = argFecha.getUTCHours();
                    const mm = argFecha.getUTCMinutes();
                    return { nombre: r.nombre, apellido: r.apellido, actividad: r.actividad, hora: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}` };
                });
                setAlumnosDePasoHoy(lista);
            })
            .catch(() => {});
    };

    useEffect(() => { fetchAlumnosHoy(); }, [session]);
    useEffect(() => { fetchAlumnosDePasoHoy(); }, [session]);

    useEffect(() => {
        const handler = () => fetchAlumnosDePasoHoy();
        window.addEventListener('alumno-de-paso-registrado', handler);
        return () => window.removeEventListener('alumno-de-paso-registrado', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        fetch('/api/gimnasio/tema')
            .then(r => r.json())
            .then(d => { if (d?.actividadesRecepcion?.length) setActividadesRecepcion(d.actividadesRecepcion); })
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

    const TODAS_ACTIVIDADES = ['Musculación', 'Intermitente', 'Otro'];

    const handleToggleActividad = async (actividad: string) => {
        const nuevas = actividadesRecepcion.includes(actividad)
            ? actividadesRecepcion.filter(a => a !== actividad)
            : [...actividadesRecepcion, actividad];
        if (nuevas.length === 0) return; // mínimo 1
        setSavingActividades(true);
        try {
            const res = await fetch('/api/gimnasio/tema', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actividadesRecepcion: nuevas }),
            });
            if (res.ok) setActividadesRecepcion(nuevas);
        } finally {
            setSavingActividades(false);
        }
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

    const handleAlumnoDePasoGlobal = async () => {
        const actividadesDisp = actividadesRecepcion.length > 0 ? actividadesRecepcion : ['Musculación'];
        const { value: datos } = await Swal.fire({
            ...swalBase,
            title: 'Alumno de paso',
            html: `
                <div class="swal-form-body">
                    <div><label class="swal-form-label">Nombre *</label><input id="dp-nombre" class="swal2-input" placeholder="Nombre"></div>
                    <div><label class="swal-form-label">Apellido *</label><input id="dp-apellido" class="swal2-input" placeholder="Apellido"></div>
                    <div><label class="swal-form-label">Actividad</label><select id="dp-actividad" class="swal2-input">${actividadesDisp.map((a: string) => `<option value="${a}">${a}</option>`).join('')}</select></div>
                    <div><label class="swal-form-label">Monto ($)</label><input id="dp-monto" class="swal2-input" inputmode="numeric" placeholder="0"></div>
                    <div><label class="swal-form-label">Método de pago</label><select id="dp-metodo" class="swal2-input"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option></select></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Registrar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const nombre = (document.getElementById('dp-nombre') as HTMLInputElement).value.trim();
                const apellido = (document.getElementById('dp-apellido') as HTMLInputElement).value.trim();
                if (!nombre || !apellido) { Swal.showValidationMessage('Nombre y apellido son obligatorios'); return; }
                return {
                    nombre,
                    apellido,
                    actividad: (document.getElementById('dp-actividad') as HTMLSelectElement).value,
                    monto: Number((document.getElementById('dp-monto') as HTMLInputElement).value.replace(/\D/g, '')) || 0,
                    metodoPago: (document.getElementById('dp-metodo') as HTMLSelectElement).value,
                };
            },
        });
        if (!datos) return;
        try {
            const res = await fetch('/api/alumnos-de-paso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });
            if (res.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno de paso registrado' });
                fetchAlumnosDePasoHoy();
            } else {
                const err = await res.json();
                Swal.fire({ ...swalNotify, icon: 'error', title: err.error || 'Error al registrar' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar' });
        }
    };

    const configItems = [
        {
            label: 'Alumno de paso', sub: 'Registrar ingreso del día', onClick: handleAlumnoDePasoGlobal,
            icon: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
        },
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
    ];

    const profesorPlanCard = esProfesor && session.user?.id ? (
        <Link href="/mi-perfil#plan" className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 text-center">Mi plan</span>
        </Link>
    ) : null;

    if (esRecepcion) {
        const slotOf = (hora: string) => {
            const h = parseInt(hora.split(':')[0]);
            if (h < 12) return 'Mañana';
            if (h < 15) return 'Siesta';
            if (h < 20) return 'Tarde';
            return 'Noche';
        };
        type Slot = 'Mañana' | 'Siesta' | 'Tarde' | 'Noche';
        const porTurno: Record<Slot, typeof alumnosHoy> = { Mañana: [], Siesta: [], Tarde: [], Noche: [] };
        for (const a of alumnosHoy) porTurno[slotOf(a.hora) as Slot].push(a);
        const SLOTS: { key: Slot; color: string; bg: string; dot: string }[] = [
            { key: 'Mañana', color: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-400'  },
            { key: 'Siesta', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-400' },
            { key: 'Tarde',  color: 'text-sky-700',    bg: 'bg-sky-50',    dot: 'bg-sky-400'    },
            { key: 'Noche',  color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-400' },
        ];
        const nombreDisplay = capitalize((session.user as any)?.nombre ?? session.user?.username ?? 'Recepción');
        const diaHoy = new Date().getDate();
        const pasoDiez = diaHoy > 10;

        return (
            <div className="max-w-7xl mx-auto pt-4 px-4 lg:px-8 pb-6">

                {/* Banner */}
                <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden mb-4">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                    <div className="pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-20 bg-teal-400" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Recepción</h1>
                            <p className="text-slate-500 text-[11px] mt-1">{fmtDate()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-white leading-none">{alumnosHoy.length + alumnosDePasoHoy.length}</p>
                            <p className="text-slate-400 text-[11px] mt-1">hoy</p>
                        </div>
                    </div>
                </div>

                {/* Hoy en el gym */}
                <div className="bg-white border border-black/[0.07] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">Hoy en el gimnasio</span>
                        {loadingHoy && (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 border-t-teal-500 animate-spin" />
                        )}
                    </div>
                    {loadingHoy && alumnosHoy.length === 0 ? (
                        <div className="p-4 space-y-2">
                            {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}
                        </div>
                    ) : alumnosHoy.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-8">Nadie llegó todavía hoy.</p>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {SLOTS.filter(s => porTurno[s.key].length > 0).map(slot => (
                                <div key={slot.key} className="px-4 py-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`w-2 h-2 rounded-full ${slot.dot}`} />
                                        <span className={`text-xs font-bold uppercase tracking-wide ${slot.color}`}>{slot.key}</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${slot.bg} ${slot.color}`}>{porTurno[slot.key].length}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {porTurno[slot.key].map((a, i) => (
                                            <Link
                                                key={i}
                                                href={`/alumnos/${a.id}/historial`}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl active:scale-[0.99] transition-all border ${!a.pagado && pasoDiez ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${!a.pagado && pasoDiez ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {a.nombre?.[0]}{a.apellido?.[0]}
                                                </div>
                                                <span className={`flex-1 text-sm font-semibold truncate ${!a.pagado && pasoDiez ? 'text-red-700' : 'text-slate-700'}`}>{a.apellido}, {a.nombre}</span>
                                                {!a.pagado && (
                                                    pasoDiez ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shrink-0">
                                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 0 0-6 6c0 3.25-1.5 5-1.5 5h15S16 11.25 16 8a6 6 0 0 0-6-6Zm0 14a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2Z"/></svg>
                                                            Debe
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 shrink-0">Sin cuota</span>
                                                    )
                                                )}
                                                <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full shrink-0">{a.actividad}</span>
                                                <span className="text-xs text-slate-400 font-medium shrink-0 tabular-nums">{a.hora}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Alumnos de paso de hoy */}
                    {alumnosDePasoHoy.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-teal-400" />
                                <span className="text-xs font-bold uppercase tracking-wide text-teal-700">De paso</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700">{alumnosDePasoHoy.length}</span>
                            </div>
                            <div className="space-y-1.5">
                                {alumnosDePasoHoy.map((a, i) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-teal-100 bg-teal-50/50">
                                        <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">
                                            {a.nombre?.[0]}{a.apellido?.[0]}
                                        </div>
                                        <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{a.apellido}, {a.nombre}</span>
                                        <span className="text-[10px] bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full shrink-0">{a.actividad}</span>
                                        <span className="text-xs text-slate-400 font-medium shrink-0 tabular-nums">{a.hora}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pt-4 pb-16 px-4 lg:px-8">

            {/* ── Banner ── */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden lg:px-8 lg:py-7 mb-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className={`pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-25 ${isSporttime ? 'bg-[#d1e08b]' : 'bg-emerald-400'}`} />
                <div className="relative lg:flex lg:items-center lg:justify-between">
                    <div>
                        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">{getGreeting()}</p>
                        <h1 className="text-xl font-bold text-white mt-0.5 truncate lg:text-2xl">
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
                    {/* Accesos rápidos inline en el banner — solo desktop */}
                    <div className="hidden lg:flex items-center gap-6 mt-0">
                        {visibleCards.map((card_nav) => (
                            <Link key={card_nav.href} href={card_nav.href}
                                className="flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity">
                                <div className="w-12 h-12 rounded-full bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
                                    {card_nav.icon}
                                </div>
                                <span className="text-[11px] font-semibold text-slate-400">{card_nav.label}</span>
                            </Link>
                        ))}
                        {esProfesor && session.user?.id && (
                            <Link href="/mi-perfil#plan" className="flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity">
                                <div className="w-12 h-12 rounded-full bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-400">Mi plan</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Accesos rápidos — solo mobile ── */}
            <div className="lg:hidden mb-5">
                <p className={`${lbl} mb-4`}>Accesos rápidos</p>
                <div className="flex justify-around">
                    {visibleCards.map((card_nav) => (
                        <Link key={card_nav.href} href={card_nav.href}
                            className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center">
                                {card_nav.icon}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600 text-center">{card_nav.label}</span>
                        </Link>
                    ))}
                    {profesorPlanCard}
                </div>
            </div>

            {/* ── Contenido principal: 2 columnas en desktop ── */}
            <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">

                {/* Columna izquierda: stat cards */}
                <div>
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
                        </div>
                    ) : data && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                            {/* Balance del mes */}
                            {esDueño && (
                                <div className={card}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className={lbl}>Balance · {mesLabel}</p>
                                        <button onClick={toggleBalance} className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                                            aria-label={showBalance ? 'Ocultar balance' : 'Mostrar balance'}>
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
                            {!esProfesor && !esRecepcion && (
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
                </div>

                {/* Columna derecha: configuración (desktop) / abajo en mobile */}
                {!esProfesor && !esRecepcion && (
                    <div className="mt-5 lg:mt-0">
                        <p className={`${lbl} mb-3`}>Configuración</p>
                        <div className="bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)] overflow-hidden">
                            {configItems.map((item, idx, arr) => (
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
                            {/* Actividades de recepción */}
                            <div className="border-t border-black/[0.04]">
                                <div className="px-4 py-3.5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-800">Recepción</p>
                                            <p className="text-xs text-slate-400">Actividades disponibles</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {TODAS_ACTIVIDADES.map(act => {
                                            const activa = actividadesRecepcion.includes(act);
                                            const esUltima = activa && actividadesRecepcion.length === 1;
                                            return (
                                                <button
                                                    key={act}
                                                    onClick={() => handleToggleActividad(act)}
                                                    disabled={savingActividades || esUltima}
                                                    className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
                                                    style={{ background: activa ? '#f0fdf4' : '#f8fafc' }}
                                                    title={esUltima ? 'Debe haber al menos una actividad' : ''}
                                                >
                                                    <span className="text-sm font-medium" style={{ color: activa ? '#065f46' : '#64748b' }}>
                                                        {act}
                                                    </span>
                                                    <div
                                                        className="w-9 h-5 rounded-full relative transition-colors"
                                                        style={{ background: activa ? '#10b981' : '#cbd5e1' }}
                                                    >
                                                        <div
                                                            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                                                            style={{ left: activa ? '18px' : '2px' }}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
}
