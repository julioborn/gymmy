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
    const { alumnoId, plantillaId, nombre, categoria, descripcion, entradaCalor, dias } = body;

    if (!alumnoId || !nombre) {
        return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

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
    });

    return NextResponse.json(plan, { status: 201 });
}
