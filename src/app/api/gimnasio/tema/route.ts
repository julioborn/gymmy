import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';
import { requireGymAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

const ACTIVIDADES_VALIDAS = ['Musculación', 'Intermitente', 'Otro'];

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.gimnasioId) return NextResponse.json(null);

    await connectMongoDB();
    const gym = await Gimnasio.findById(session.user.gimnasioId)
        .select('nombre logoUrl logoHeaderUrl temaFondo temaAcento temaAcento2 actividadesRecepcion')
        .lean();
    if (!gym) return NextResponse.json(null);

    const { nombre, logoUrl, logoHeaderUrl, temaFondo, temaAcento, temaAcento2, actividadesRecepcion } = gym as any;

    return NextResponse.json(
        {
            nombre,
            logoUrl: logoHeaderUrl || logoUrl || null,
            temaFondo: temaFondo || null,
            temaAcento: temaAcento || null,
            temaAcento2: temaAcento2 || null,
            actividadesRecepcion: (actividadesRecepcion?.length ? actividadesRecepcion : ['Musculación']),
        },
        {
            headers: {
                'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
            },
        }
    );
}

export async function PATCH(request: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    const body = await request.json();
    const { actividadesRecepcion } = body;

    if (!Array.isArray(actividadesRecepcion)) {
        return NextResponse.json({ error: 'actividadesRecepcion debe ser un array' }, { status: 400 });
    }

    const validas = actividadesRecepcion.filter((a: string) => ACTIVIDADES_VALIDAS.includes(a));
    if (validas.length === 0) {
        return NextResponse.json({ error: 'Debe haber al menos una actividad' }, { status: 400 });
    }

    await connectMongoDB();
    await Gimnasio.findByIdAndUpdate(gimnasioId, { actividadesRecepcion: validas });

    return NextResponse.json({ ok: true, actividadesRecepcion: validas });
}
