import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';
import { requireGymAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;

    const { gimnasioId } = auth.session.user;
    await connectMongoDB();

    const gym = await Gimnasio.findById(gimnasioId);
    if (!gym) return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });

    const token = gym.mercadopagoAccessToken;
    return NextResponse.json({
        hasToken: !!token,
        preview: token ? `...${token.slice(-8)}` : null,
    });
}

export async function PUT(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;

    const { gimnasioId } = auth.session.user;
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    await connectMongoDB();
    await Gimnasio.findByIdAndUpdate(gimnasioId, { mercadopagoAccessToken: token.trim() });

    return NextResponse.json({ ok: true });
}
