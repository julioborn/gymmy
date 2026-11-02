import { NextRequest, NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import connectMongoDB from '@/lib/mongodb';
import CierreCaja from '@/models/CierreCaja';
import { calcularCaja, obtenerFechaDesde } from '@/lib/caja';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role } = auth.session.user;

    if (role !== 'recepcion') {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectMongoDB();
    const cierres = await CierreCaja.find({ gimnasioId: String(gimnasioId) })
        .sort({ fechaHasta: -1 })
        .limit(50)
        .lean();

    return NextResponse.json({ ok: true, cierres });
}

const RESPONSABLES_VALIDOS = ['Victoria Cardonati', 'Maximiliano Cerdán', 'Candela Fiad', 'Bruno Martinenghi', 'Canela Zordán'];

export async function POST(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role, id } = auth.session.user;

    if (role !== 'recepcion') {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { registradoPorNombre: elegido } = await req.json().catch(() => ({ registradoPorNombre: null }));
    if (!elegido || !RESPONSABLES_VALIDOS.includes(elegido)) {
        return NextResponse.json({ error: 'Elegí quién cierra la caja' }, { status: 400 });
    }

    const gid = String(gimnasioId);
    const fechaDesde = await obtenerFechaDesde(gid);
    const fechaHasta = new Date();
    const resumen = await calcularCaja(gid, fechaDesde, fechaHasta);

    const registradoPorNombre = elegido;

    await connectMongoDB();
    const cierre = await CierreCaja.create({
        gimnasioId: gid,
        fechaDesde,
        fechaHasta,
        totalEfectivo: resumen.totalEfectivo,
        totalTransferencia: resumen.totalTransferencia,
        totalOtros: resumen.totalOtros,
        totalGeneral: resumen.totalGeneral,
        cantidadPagos: resumen.cantidadPagos,
        registradoPorId: id,
        registradoPorNombre,
    });

    return NextResponse.json({ ok: true, cierre }, { status: 201 });
}
