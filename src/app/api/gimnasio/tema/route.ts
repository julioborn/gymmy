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
        .select('nombre logoUrl logoHeaderUrl temaFondo temaAcento temaAcento2')
        .lean();
    if (!gym) return NextResponse.json(null);

    const { nombre, logoUrl, logoHeaderUrl, temaFondo, temaAcento, temaAcento2 } = gym as any;

    return NextResponse.json(
        {
            nombre,
            logoUrl: logoHeaderUrl || logoUrl || null,
            temaFondo: temaFondo || null,
            temaAcento: temaAcento || null,
            temaAcento2: temaAcento2 || null,
        },
        {
            headers: {
                'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
            },
        }
    );
}
