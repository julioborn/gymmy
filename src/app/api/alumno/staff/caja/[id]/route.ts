import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import CierreCaja from '@/models/CierreCaja';
import { requireAlumnoAuth } from '@/lib/requireAuth';
import { esStaffAlumno } from '@/lib/staffAlumnos';
import { calcularCaja } from '@/lib/caja';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    await connectMongoDB();
    const yo = await Alumno.findById(auth.session.user.id).select('dni gimnasioId');
    if (!yo || !esStaffAlumno(yo.dni)) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const gid = String(yo.gimnasioId);
    const cierre = await CierreCaja.findOne({ _id: params.id, gimnasioId: gid }).lean();
    if (!cierre) {
        return NextResponse.json({ error: 'Cierre no encontrado' }, { status: 404 });
    }

    const resumen = await calcularCaja(gid, (cierre as any).fechaDesde, (cierre as any).fechaHasta);

    return NextResponse.json({ ok: true, detalle: resumen.detalle });
}
