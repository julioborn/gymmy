import { NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { session } = auth;

    if (!['dueño', 'admin'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { password } = await req.json();
    if (!password || password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    await connectMongoDB();

    const alumno = await Alumno.findOne({ _id: params.id, gimnasioId: session.user.gimnasioId });
    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });

    const hashed = await bcrypt.hash(password, 10);
    await Alumno.updateOne({ _id: params.id }, { $set: { password: hashed } });

    return NextResponse.json({ ok: true });
}
