import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const origin = req.nextUrl.origin;

    let gymName = 'SportTime';

    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.gimnasioId) {
            await connectMongoDB();
            const gym = await Gimnasio.findById(session.user.gimnasioId)
                .select('nombre')
                .lean() as any;
            if (gym?.nombre) gymName = gym.nombre;
        }
    } catch {
        // fallback to default name
    }

    const manifest = {
        name: gymName,
        short_name: gymName,
        description: `App de ${gymName}`,
        start_url: '/',
        display: 'standalone',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [
            {
                src: `${origin}/icons/icon-192x192.png`,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: `${origin}/icons/icon-512x512.png`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: `${origin}/icons/icon-512x512.png`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'no-store',
        },
    });
}
