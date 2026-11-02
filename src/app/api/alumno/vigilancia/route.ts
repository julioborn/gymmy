import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Vigilancia from '@/models/Vigilancia';
import { requireAlumnoAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

const DNI_AUTORIZADO = '43844409';

export async function GET() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;
    const alumnoId = auth.session.user.id;

    await connectMongoDB();
    const yo = await Alumno.findById(alumnoId).select('dni gimnasioId');
    if (!yo || yo.dni !== DNI_AUTORIZADO) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const [alumnos, vigilancias] = await Promise.all([
        Alumno.find({ gimnasioId: yo.gimnasioId, _id: { $ne: alumnoId } })
            .select('nombre apellido dni')
            .sort({ apellido: 1 })
            .lean(),
        Vigilancia.find({ watcherAlumnoId: alumnoId }).select('alumnoId').lean(),
    ]);

    return NextResponse.json({
        ok: true,
        alumnos: (alumnos as any[]).map(a => ({ _id: String(a._id), nombre: a.nombre, apellido: a.apellido, dni: a.dni })),
        watching: (vigilancias as any[]).map(v => String(v.alumnoId)),
    });
}

export async function POST(request: Request) {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;
    const alumnoId = auth.session.user.id;

    await connectMongoDB();
    const yo = await Alumno.findById(alumnoId).select('dni gimnasioId');
    if (!yo || yo.dni !== DNI_AUTORIZADO) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const { alumnoId: targetId } = await request.json().catch(() => ({ alumnoId: null }));
    if (!targetId) {
        return NextResponse.json({ error: 'Falta alumnoId' }, { status: 400 });
    }

    const existente = await Vigilancia.findOne({ watcherAlumnoId: alumnoId, alumnoId: targetId });
    if (existente) {
        await existente.deleteOne();
        return NextResponse.json({ ok: true, watching: false });
    }

    await Vigilancia.create({ gimnasioId: yo.gimnasioId, watcherAlumnoId: alumnoId, alumnoId: targetId });
    return NextResponse.json({ ok: true, watching: true });
}
