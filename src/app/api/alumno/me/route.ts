import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import '@/models/Gimnasio'; // registrar el schema para populate
import { requireAlumnoAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    const alumnoId = auth.session.user.id;

    await connectMongoDB();

    const alumno = await Alumno.findById(alumnoId).populate('gimnasioId', 'nombre');

    if (!alumno) {
        return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    return NextResponse.json(alumno);
}
