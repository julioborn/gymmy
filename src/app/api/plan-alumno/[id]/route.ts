import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import PlanAlumno from '@/models/PlanAlumno';
import { requireGymAuth } from '@/lib/requireAuth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    await connectMongoDB();
    const plan = await PlanAlumno.findById(params.id);
    if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

    return NextResponse.json(plan);
}

// Profesor updates: can change everything (nombre, ejercicios, kg de referencia, etc.)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    const body = await req.json();

    await connectMongoDB();
    const plan = await PlanAlumno.findOneAndUpdate(
        { _id: params.id, gimnasioId },
        { $set: body },
        { new: true }
    );
    if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

    return NextResponse.json(plan);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();
    const plan = await PlanAlumno.findOneAndDelete({ _id: params.id, gimnasioId });
    if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true });
}
