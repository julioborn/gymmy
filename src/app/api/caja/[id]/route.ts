import { NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import connectMongoDB from '@/lib/mongodb';
import CierreCaja from '@/models/CierreCaja';
import { calcularCaja } from '@/lib/caja';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role } = auth.session.user;

    if (role !== 'recepcion') {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectMongoDB();
    const cierre = await CierreCaja.findOne({ _id: params.id, gimnasioId: String(gimnasioId) }).lean();
    if (!cierre) {
        return NextResponse.json({ error: 'Cierre no encontrado' }, { status: 404 });
    }

    const resumen = await calcularCaja(String(gimnasioId), (cierre as any).fechaDesde, (cierre as any).fechaHasta);

    return NextResponse.json({ ok: true, detalle: resumen.detalle });
}
