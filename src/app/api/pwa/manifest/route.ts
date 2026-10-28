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

    let gymName = 'SportTime';
    let gymLogoUrl: string | null = null;
    let gimnasioId: string | null = null;

    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.gimnasioId) {
            gimnasioId = String(session.user.gimnasioId);
            await connectMongoDB();
            const gym = await Gimnasio.findById(gimnasioId)
                .select('nombre logoUrl')
                .lean() as any;
            if (gym) {
                gymName = gym.nombre || 'SportTime';
                if (gym.logoUrl) gymLogoUrl = gym.logoUrl;
            }
        }
    } catch {
        // fallback to defaults
    }

    // Build icons: if gym has a logo, proxy it through our domain so Chrome
    // can load it without CORS issues, then fall back to static defaults.
    const icons: { src: string; sizes: string; type: string; purpose: string }[] = [];

    if (gymLogoUrl && gimnasioId) {
        const proxyBase = `${origin}/api/pwa/icon?id=${gimnasioId}`;
        icons.push(
            { src: proxyBase, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            { src: proxyBase, sizes: '192x192', type: 'image/png', purpose: 'any' },
        );
    }

    // Always include static fallbacks so Chrome always has a valid local icon
    icons.push(
        { src: defaultIcon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: defaultIcon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    );

    const manifest = {
        name: gymName,
        short_name: gymName,
        description: `App de ${gymName}`,
        start_url: '/',
        display: 'standalone',
        background_color: '#111111',
        theme_color: '#111111',
        icons,
    };

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'no-store',
        },
    });
}
