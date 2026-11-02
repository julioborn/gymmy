import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import AlumnoDePaso from '@/models/AlumnoDePaso';
import CierreCaja from '@/models/CierreCaja';

export type DetallePagoCaja = {
    tipo: 'cuota' | 'depaso';
    nombre: string;
    apellido: string;
    metodoPago: string;
    monto: number;
    fecha: string;
};

export type ResumenCaja = {
    fechaDesde: Date;
    fechaHasta: Date;
    totalEfectivo: number;
    totalTransferencia: number;
    totalOtros: number;
    totalGeneral: number;
    cantidadPagos: number;
    detalle: DetallePagoCaja[];
};

const ARG = -3 * 60 * 60 * 1000;

/** Medianoche de hoy en hora Argentina, como instante UTC correcto. */
function inicioDeHoyArg(): Date {
    const nowArg = new Date(Date.now() + ARG);
    return new Date(Date.UTC(nowArg.getUTCFullYear(), nowArg.getUTCMonth(), nowArg.getUTCDate()) - ARG);
}

/**
 * Desde cuándo arranca el próximo turno: el fin del último cierre; si no hubo
 * ninguno hoy, el momento del primer pago (cuota o de paso) registrado hoy
 * -- no medianoche, el turno arranca con el primer movimiento real del día.
 * Si todavía no se registró nada hoy, devuelve "ahora" (período vacío).
 */
export async function obtenerFechaDesde(gimnasioId: string): Promise<Date> {
    await connectMongoDB();
    const ultimo = await CierreCaja.findOne({ gimnasioId }).sort({ fechaHasta: -1 }).lean();
    if (ultimo) return new Date((ultimo as any).fechaHasta);

    const inicioHoy = inicioDeHoyArg();
    const ahora = new Date();

    const [alumnosConPagoHoy, primerDepaso] = await Promise.all([
        Alumno.find(
            { gimnasioId, 'pagos.fechaPago': { $gte: inicioHoy, $lte: ahora } },
            { pagos: 1 },
        ).lean(),
        AlumnoDePaso.findOne({ gimnasioId, fecha: { $gte: inicioHoy, $lte: ahora } }).sort({ fecha: 1 }).lean(),
    ]);

    let primerPagoHoy: Date | null = null;
    for (const a of alumnosConPagoHoy as any[]) {
        for (const p of a.pagos || []) {
            const f = new Date(p.fechaPago);
            if (f >= inicioHoy && f <= ahora && (!primerPagoHoy || f < primerPagoHoy)) {
                primerPagoHoy = f;
            }
        }
    }

    const primerDepasoFecha = primerDepaso ? new Date((primerDepaso as any).fecha) : null;
    const candidatos = [primerPagoHoy, primerDepasoFecha].filter(Boolean) as Date[];
    if (candidatos.length === 0) return ahora;

    return candidatos.reduce((min, d) => (d < min ? d : min));
}

export async function calcularCaja(gimnasioId: string, fechaDesde: Date, fechaHasta: Date): Promise<ResumenCaja> {
    await connectMongoDB();

    const [alumnos, depasos] = await Promise.all([
        Alumno.find(
            { gimnasioId, 'pagos.fechaPago': { $gt: fechaDesde, $lte: fechaHasta } },
            { nombre: 1, apellido: 1, pagos: 1 },
        ).lean(),
        AlumnoDePaso.find(
            { gimnasioId, fecha: { $gt: fechaDesde, $lte: fechaHasta } },
            { nombre: 1, apellido: 1, metodoPago: 1, monto: 1, fecha: 1 },
        ).lean(),
    ]);

    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalOtros = 0;
    const detalle: DetallePagoCaja[] = [];

    for (const a of alumnos as any[]) {
        for (const p of a.pagos || []) {
            const f = new Date(p.fechaPago);
            if (!(f > fechaDesde && f <= fechaHasta)) continue;
            const monto = p.tarifa ?? 0;
            if (p.metodoPago === 'mixto') {
                totalEfectivo += p.montoEfectivo ?? 0;
                totalTransferencia += p.montoTransferencia ?? 0;
            } else if (p.metodoPago === 'efectivo') {
                totalEfectivo += monto;
            } else if (p.metodoPago === 'transferencia') {
                totalTransferencia += monto;
            } else {
                totalOtros += monto;
            }
            detalle.push({ tipo: 'cuota', nombre: a.nombre, apellido: a.apellido, metodoPago: p.metodoPago, monto, fecha: f.toISOString() });
        }
    }

    for (const d of depasos as any[]) {
        const monto = d.monto ?? 0;
        if (d.metodoPago === 'efectivo') totalEfectivo += monto;
        else if (d.metodoPago === 'transferencia') totalTransferencia += monto;
        else totalOtros += monto;
        detalle.push({ tipo: 'depaso', nombre: d.nombre, apellido: d.apellido, metodoPago: d.metodoPago, monto, fecha: new Date(d.fecha).toISOString() });
    }

    detalle.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    return {
        fechaDesde,
        fechaHasta,
        totalEfectivo,
        totalTransferencia,
        totalOtros,
        totalGeneral: totalEfectivo + totalTransferencia + totalOtros,
        cantidadPagos: detalle.length,
        detalle,
    };
}
