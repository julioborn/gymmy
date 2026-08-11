import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();
    const gym = await Gimnasio.findById(gimnasioId).select('alias');
    return NextResponse.json({ alias: gym?.alias ?? '' });
}

export async function PUT(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    const { alias } = await req.json();
    if (typeof alias !== 'string') {
        return NextResponse.json({ error: 'Alias inválido' }, { status: 400 });
    }

    await connectMongoDB();
    await Gimnasio.findByIdAndUpdate(gimnasioId, { alias: alias.trim() });
    return NextResponse.json({ ok: true });
}
