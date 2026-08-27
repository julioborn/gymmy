import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.gimnasioId) return NextResponse.json(null);

    await connectMongoDB();
    const gym = await Gimnasio.findById(session.user.gimnasioId)
        .select('nombre logoUrl logoHeaderUrl temaFondo temaAcento temaAcento2');
    if (!gym) return NextResponse.json(null);

    return NextResponse.json({
        nombre: gym.nombre,
        logoUrl: gym.logoHeaderUrl || gym.logoUrl || null,
        temaFondo: gym.temaFondo || null,
        temaAcento: gym.temaAcento || null,
        temaAcento2: gym.temaAcento2 || null,
    });
}
