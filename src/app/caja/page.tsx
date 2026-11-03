'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { swalBase, swalNotify } from '@/utils/swalConfig';
import { ChevronLeft, Banknote, Landmark, Wallet, Clock, ChevronDown } from 'lucide-react';

type DetallePago = {
    tipo: 'cuota' | 'depaso';
    nombre: string;
    apellido: string;
    metodoPago: string;
    monto: number;
    fecha: string;
};

type Preview = {
    fechaDesde: string;
    fechaHasta: string;
    totalEfectivo: number;
    totalTransferencia: number;
    totalOtros: number;
    totalGeneral: number;
    cantidadPagos: number;
    detalle: DetallePago[];
};

type Cierre = {
    _id: string;
    fechaDesde: string;
    fechaHasta: string;
    totalEfectivo: number;
    totalTransferencia: number;
    totalOtros: number;
    totalGeneral: number;
    cantidadPagos: number;
    registradoPorNombre: string;
};

const fmtHora = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

const RESPONSABLES = ['Victoria Cardonati', 'Maximiliano Cerdán', 'Candela Fiad', 'Bruno Martinenghi', 'Canela Zordán'];

export default function CierreCajaPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [preview, setPreview] = useState<Preview | null>(null);
    const [cierres, setCierres] = useState<Cierre[]>([]);
    const [loading, setLoading] = useState(true);
    const [cerrando, setCerrando] = useState(false);
    const [cierreAbierto, setCierreAbierto] = useState<string | null>(null);
    const [detalles, setDetalles] = useState<Record<string, DetallePago[]>>({});
    const [cargandoDetalle, setCargandoDetalle] = useState<string | null>(null);

    const toggleCierre = (id: string) => {
        if (cierreAbierto === id) { setCierreAbierto(null); return; }
        setCierreAbierto(id);
        if (detalles[id]) return;
        setCargandoDetalle(id);
        fetch(`/api/caja/${id}`).then(r => r.json()).then(d => {
            if (d.ok) setDetalles(prev => ({ ...prev, [id]: d.detalle }));
        }).catch(() => {}).finally(() => setCargandoDetalle(null));
    };

    useEffect(() => {
        if (status !== 'loading' && session?.user?.role !== 'recepcion') {
            router.push('/');
        }
    }, [session, status, router]);

    const cargar = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/caja/preview').then(r => r.json()),
            fetch('/api/caja').then(r => r.json()),
        ]).then(([p, c]) => {
            if (p.ok) setPreview(p);
            if (c.ok) setCierres(c.cierres);
        }).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const handleCerrar = async () => {
        if (!preview) return;
        const { value: responsable } = await Swal.fire({
            ...swalBase,
            title: 'Cerrar caja',
            html: `
                <div class="swal-form-body">
                    <p style="text-align:center;color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0 0 1rem;">
                        Vas a cerrar el período desde <strong style="color:#fff;">${fmtHora(preview.fechaDesde)}</strong> hasta <strong style="color:#fff;">${fmtHora(preview.fechaHasta)}</strong>.
                    </p>
                    <p style="text-align:center;font-size:0.9rem;color:#fff;margin:0 0 1rem;">
                        Efectivo <strong>${fmt(preview.totalEfectivo)}</strong> · Transferencia <strong>${fmt(preview.totalTransferencia)}</strong>
                    </p>
                    <label class="swal-form-label">¿Quién cierra la caja?</label>
                    <select id="swal-responsable" class="swal2-select">
                        <option value="">Seleccioná un nombre</option>
                        ${RESPONSABLES.map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Cerrar caja',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const val = (document.getElementById('swal-responsable') as HTMLSelectElement).value;
                if (!val) { Swal.showValidationMessage('Elegí quién cierra la caja'); return; }
                return val;
            },
        });
        if (!responsable) return;

        setCerrando(true);
        try {
            const res = await fetch('/api/caja', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registradoPorNombre: responsable }),
            });
            if (res.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Caja cerrada correctamente' });
                cargar();
            } else {
                const d = await res.json().catch(() => ({}));
                Swal.fire({ ...swalNotify, icon: 'error', title: d.error || 'No se pudo cerrar la caja' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error de conexión' });
        } finally {
            setCerrando(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <div className="fixed inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative max-w-2xl mx-auto px-5 py-4 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all">
                        <ChevronLeft size={18} />
                    </Link>
                    <h1 className="text-white font-bold text-xl">Cierre de caja</h1>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-lime-400 animate-spin" />
                    </div>
                ) : preview && (
                    <>
                        {/* Preview del turno actual */}
                        <div className="bg-white/[0.04] border border-white/[0.07] rounded-[1.5rem] p-5">
                            <div className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-wide mb-4">
                                <Clock size={13} />
                                Desde {fmtHora(preview.fechaDesde)} hasta {fmtHora(preview.fechaHasta)}
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 mb-3">
                                <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-1.5">
                                    <Banknote size={16} className="text-emerald-400" />
                                    <p className="text-white font-black text-xl tabular-nums leading-none">{fmt(preview.totalEfectivo)}</p>
                                    <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wide">Efectivo</p>
                                </div>
                                <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-1.5">
                                    <Landmark size={16} className="text-blue-400" />
                                    <p className="text-white font-black text-xl tabular-nums leading-none">{fmt(preview.totalTransferencia)}</p>
                                    <p className="text-blue-400/70 text-[10px] font-bold uppercase tracking-wide">Transferencia</p>
                                </div>
                            </div>

                            {preview.totalOtros > 0 && (
                                <div className="flex items-center justify-between px-1 mb-3 text-white/50 text-xs">
                                    <span>Otros medios (MercadoPago, etc.)</span>
                                    <span className="font-semibold text-white/70 tabular-nums">{fmt(preview.totalOtros)}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                                <div className="flex items-center gap-1.5 text-white/60 text-sm">
                                    <Wallet size={14} />
                                    Total del turno
                                </div>
                                <span className="text-white font-black text-lg tabular-nums">{fmt(preview.totalGeneral)}</span>
                            </div>
                            <p className="text-white/35 text-xs mt-1">{preview.cantidadPagos} {preview.cantidadPagos === 1 ? 'pago' : 'pagos'} registrados</p>
                        </div>

                        <button
                            onClick={handleCerrar}
                            disabled={cerrando}
                            className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 active:bg-lime-500 disabled:opacity-50 text-black font-bold text-base transition-all shadow-md shadow-lime-400/20"
                        >
                            {cerrando ? 'Cerrando...' : 'Cerrar caja'}
                        </button>

                        {/* Detalle del turno actual */}
                        {preview.detalle.length > 0 && (
                            <div className="bg-white/[0.04] border border-white/[0.07] rounded-[1.5rem] overflow-hidden">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.14em] px-5 pt-4 pb-2">Pagos de este turno</p>
                                <div className="divide-y divide-white/[0.04]">
                                    {preview.detalle.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between gap-3 px-5 py-2.5">
                                            <div className="min-w-0">
                                                <p className="text-white/85 text-sm font-medium truncate">{p.apellido}, {p.nombre}</p>
                                                <p className="text-white/40 text-xs capitalize">{p.metodoPago} · {fmtHora(p.fecha)}</p>
                                            </div>
                                            <span className="text-white/70 text-sm font-semibold tabular-nums shrink-0">{fmt(p.monto)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Historial de cierres */}
                        <div className="bg-white/[0.04] border border-white/[0.07] rounded-[1.5rem] overflow-hidden">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.14em] px-5 pt-4 pb-2">Historial de cierres</p>
                            {cierres.length === 0 ? (
                                <p className="text-white/40 text-sm text-center py-8">Todavía no se registró ningún cierre.</p>
                            ) : (
                                <div className="divide-y divide-white/[0.04]">
                                    {cierres.map(c => {
                                        const abierto = cierreAbierto === c._id;
                                        const detalle = detalles[c._id];
                                        return (
                                            <div key={c._id}>
                                                <button onClick={() => toggleCierre(c._id)} className="w-full text-left px-5 py-3 hover:bg-white/[0.03] transition-colors">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-white/85 text-sm font-semibold">{fmtHora(c.fechaDesde)} → {fmtHora(c.fechaHasta)}</p>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-white font-bold text-sm tabular-nums">{fmt(c.totalGeneral)}</span>
                                                            <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-white/45">
                                                        <span>Efectivo {fmt(c.totalEfectivo)}</span>
                                                        <span>·</span>
                                                        <span>Transferencia {fmt(c.totalTransferencia)}</span>
                                                        <span>·</span>
                                                        <span>{c.registradoPorNombre}</span>
                                                    </div>
                                                </button>
                                                {abierto && (
                                                    <div className="px-5 pb-3">
                                                        {cargandoDetalle === c._id ? (
                                                            <div className="flex justify-center py-6">
                                                                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-lime-400 animate-spin" />
                                                            </div>
                                                        ) : !detalle || detalle.length === 0 ? (
                                                            <p className="text-white/35 text-xs text-center py-4">Sin pagos en este cierre.</p>
                                                        ) : (
                                                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
                                                                {detalle.map((p, i) => (
                                                                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                                                        <div className="min-w-0">
                                                                            <p className="text-white/85 text-sm font-medium truncate">{p.apellido}, {p.nombre}</p>
                                                                            <p className="text-white/40 text-xs capitalize">{p.tipo === 'depaso' ? 'De paso · ' : ''}{p.metodoPago} · {fmtHora(p.fecha)}</p>
                                                                        </div>
                                                                        <span className="text-white/70 text-sm font-semibold tabular-nums shrink-0">{fmt(p.monto)}</span>
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
                    </>
                )}
            </div>
        </div>
    );
}
