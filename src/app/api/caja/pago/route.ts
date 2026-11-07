import { NextRequest, NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import AlumnoDePaso from '@/models/AlumnoDePaso';
import { recalcularCierresQueIncluyen } from '@/lib/caja';

export const dynamic = 'force-dynamic';

const METODOS_VALIDOS = ['efectivo', 'transferencia', 'mercadopago'];

export async function PATCH(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role } = auth.session.user;

    if (!['dueño', 'admin'].includes(role ?? '')) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { tipo, alumnoId, pagoId, depasoId, monto, metodoPago } = await req.json().catch(() => ({}));

    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum < 0) {
        return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }
    if (!METODOS_VALIDOS.includes(metodoPago)) {
        return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    await connectMongoDB();

    let fecha: Date;

    if (tipo === 'cuota') {
        if (!alumnoId || !pagoId) return NextResponse.json({ error: 'Faltan datos del pago' }, { status: 400 });
        const alumno = await Alumno.findOne({ _id: alumnoId, gimnasioId });
        if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
        const pago = (alumno.pagos as any).id(pagoId);
        if (!pago) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

        pago.tarifa = montoNum;
        pago.metodoPago = metodoPago;
        pago.montoEfectivo = undefined;
        pago.montoTransferencia = undefined;
        await alumno.save();
        fecha = new Date(pago.fechaPago);
    } else if (tipo === 'depaso') {
        if (!depasoId) return NextResponse.json({ error: 'Falta el id del registro' }, { status: 400 });
        const registro = await AlumnoDePaso.findOneAndUpdate(
            { _id: depasoId, gimnasioId },
            { $set: { monto: montoNum, metodoPago } },
            { new: true },
        );
        if (!registro) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
        fecha = new Date(registro.fecha);
    } else {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    await recalcularCierresQueIncluyen(String(gimnasioId), fecha);

    return NextResponse.json({ ok: true });
}
