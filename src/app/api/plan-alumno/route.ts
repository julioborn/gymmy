import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import PlanAlumno from '@/models/PlanAlumno';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();
    const planes = await PlanAlumno.find({ gimnasioId }).sort({ createdAt: -1 });
    return NextResponse.json(planes);
}

export async function POST(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    const body = await req.json();
    const { alumnoId, plantillaId, nombre, categoria, descripcion, entradaCalor, dias, totalSemanas, fechaInicio } = body;

    if (!alumnoId || !nombre) {
        return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Normalize fechaInicio to midnight UTC of the given date so same-day sessions are always included
    const normalizarFecha = (f?: string) => {
        if (!f) return new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
        return new Date(f.slice(0, 10) + 'T00:00:00Z');
    };

    await connectMongoDB();
    const plan = await PlanAlumno.create({
        gimnasioId,
        alumnoId,
        plantillaId: plantillaId || undefined,
        nombre,
        categoria: categoria || '',
        descripcion: descripcion || '',
        entradaCalor: entradaCalor || { ejercicios: [] },
        dias: dias || [],
        totalSemanas: totalSemanas || 4,
        fechaInicio: normalizarFecha(fechaInicio),
    });

    return NextResponse.json(plan, { status: 201 });
}
