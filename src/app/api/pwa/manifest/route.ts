import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const origin = req.nextUrl.origin;
    const defaultIcon192 = `${origin}/icons/icon-192x192.png`;
    const defaultIcon512 = `${origin}/icons/icon-512x512.png`;

    let gymName = 'Gymmy';
    let icon192 = defaultIcon192;
    let icon512 = defaultIcon512;

    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.gimnasioId) {
            await connectMongoDB();
            const gym = await Gimnasio.findById(session.user.gimnasioId)
                .select('nombre logoUrl')
                .lean() as any;
            if (gym) {
                gymName = gym.nombre || 'Gymmy';
                if (gym.logoUrl) {
                    icon192 = gym.logoUrl;
                    icon512 = gym.logoUrl;
                }
            }
        }
    } catch {
        // fallback to defaults
    }

    const manifest = {
        name: gymName,
        short_name: gymName,
        description: `App de ${gymName}`,
        start_url: '/',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        icons: [
            { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'no-store',
        },
    });
}
