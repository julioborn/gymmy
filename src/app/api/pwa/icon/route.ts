import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.redirect(new URL('/icons/icon-512x512.png', req.nextUrl.origin));

    try {
        await connectMongoDB();
        const gym = await Gimnasio.findById(id).select('logoUrl').lean() as any;
        if (!gym?.logoUrl) {
            return NextResponse.redirect(new URL('/icons/icon-512x512.png', req.nextUrl.origin));
        }

        const res = await fetch(gym.logoUrl);
        if (!res.ok) {
            return NextResponse.redirect(new URL('/icons/icon-512x512.png', req.nextUrl.origin));
        }

        const contentType = res.headers.get('content-type') || 'image/png';
        const buf = await res.arrayBuffer();

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch {
        return NextResponse.redirect(new URL('/icons/icon-512x512.png', req.nextUrl.origin));
    }
}
