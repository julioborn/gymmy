import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const fallback = `${req.nextUrl.origin}/icons/apple-touch-icon.png`;

    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.gimnasioId) {
            await connectMongoDB();
            const gym = await Gimnasio.findById(session.user.gimnasioId)
                .select('logoUrl')
                .lean() as any;
            if (gym?.logoUrl) {
                return NextResponse.redirect(gym.logoUrl);
            }
        }
    } catch {
        // fallback
    }

    return NextResponse.redirect(fallback);
}
