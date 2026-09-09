import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongoClient';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username')?.trim();

    if (!username) return NextResponse.json({ found: false });

    const { db } = await getDb();
    const user = await db.collection('usuarios').findOne(
        { username },
        { projection: { gimnasioId: 1, nombre: 1, apellido: 1 } }
    );
    if (!user) return NextResponse.json({ found: false });

    let gimnasioLogoUrl: string | null = null;
    if (user.gimnasioId) {
        const gym = await db.collection('gimnasios').findOne(
            { _id: user.gimnasioId },
            { projection: { logoHeaderUrl: 1, logoUrl: 1 } }
        );
        gimnasioLogoUrl = gym?.logoHeaderUrl || gym?.logoUrl || null;
    }

    return NextResponse.json({
        found: true,
        gimnasioLogoUrl,
        nombre: user.nombre || null,
        apellido: user.apellido || null,
    });
}
