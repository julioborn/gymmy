import { NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import { calcularCaja, obtenerFechaDesde } from '@/lib/caja';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role } = auth.session.user;

    if (!['recepcion', 'profesor', 'dueño', 'admin'].includes(role ?? '')) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const gid = String(gimnasioId);
    const fechaDesde = await obtenerFechaDesde(gid);
    const fechaHasta = new Date();
    const resumen = await calcularCaja(gid, fechaDesde, fechaHasta);

    return NextResponse.json({ ok: true, ...resumen });
}
