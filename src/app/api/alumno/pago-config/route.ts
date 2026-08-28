import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gimnasio from '@/models/Gimnasio';
import { requireAlumnoAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    const alumnoId = auth.session.user.id;

    await connectMongoDB();

    const alumno = await Alumno.findById(alumnoId).select('gimnasioId');
    if (!alumno) return NextResponse.json({ alias: '', tieneMP: false });

    const gym = await Gimnasio.findById(alumno.gimnasioId).select('alias mercadopagoAccessToken');
    if (!gym) return NextResponse.json({ alias: '', tieneMP: false });

    return NextResponse.json({
        alias: gym.alias ?? '',
        tieneMP: !!gym.mercadopagoAccessToken,
    });
}
