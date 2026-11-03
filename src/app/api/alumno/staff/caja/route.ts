import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import CierreCaja from '@/models/CierreCaja';
import { requireAlumnoAuth } from '@/lib/requireAuth';
import { esStaffAlumno } from '@/lib/staffAlumnos';
import { calcularCaja, obtenerFechaDesde } from '@/lib/caja';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    await connectMongoDB();
    const yo = await Alumno.findById(auth.session.user.id).select('dni nombre apellido gimnasioId');
    if (!yo || !esStaffAlumno(yo.dni)) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const gid = String(yo.gimnasioId);
    const fechaDesde = await obtenerFechaDesde(gid);
    const fechaHasta = new Date();
    const preview = await calcularCaja(gid, fechaDesde, fechaHasta);

    const miNombre = `${yo.nombre} ${yo.apellido}`;
    const cierres = await CierreCaja.find({ gimnasioId: gid, registradoPorNombre: miNombre })
        .sort({ fechaHasta: -1 })
        .limit(50)
        .lean();

    return NextResponse.json({ ok: true, preview, cierres });
}
