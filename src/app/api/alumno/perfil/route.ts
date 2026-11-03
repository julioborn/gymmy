import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireAlumnoAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(request: Request) {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    const { email } = await request.json().catch(() => ({ email: null }));
    const nuevoEmail = (email ?? '').toLowerCase().trim();

    if (!nuevoEmail || !EMAIL_RE.test(nuevoEmail)) {
        return NextResponse.json({ error: 'Ingresá un email válido' }, { status: 400 });
    }

    await connectMongoDB();

    const yo = await Alumno.findById(auth.session.user.id).select('gimnasioId');
    if (!yo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const enUso = await Alumno.findOne({
        gimnasioId: yo.gimnasioId,
        email: nuevoEmail,
        _id: { $ne: auth.session.user.id },
    });
    if (enUso) {
        return NextResponse.json({ error: 'Ese email ya está en uso por otra cuenta' }, { status: 409 });
    }

    await Alumno.updateOne({ _id: auth.session.user.id }, { $set: { email: nuevoEmail } });

    return NextResponse.json({ ok: true, email: nuevoEmail });
}
