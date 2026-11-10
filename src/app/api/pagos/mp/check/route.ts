import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

export const dynamic = 'force-dynamic';

// Reemplaza al viejo SSE de /api/pagos/mp/events: el cliente manda desde
// cuándo quiere saber si hubo pagos nuevos (?since=ISO) con un fetch corto
// cada 15s, en vez de mantener una conexión abierta reconectándose sola.
export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.gimnasioId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const gimnasioId = String(token.gimnasioId);
    const sinceParam = req.nextUrl.searchParams.get('since');
    const since = sinceParam && !isNaN(Date.parse(sinceParam)) ? new Date(sinceParam) : new Date(Date.now() - 10000);
    const checkedAt = new Date();

    await connectMongoDB();
    const found = await Alumno.exists({
        gimnasioId,
        'pagos.fechaPago': { $gt: since },
    });

    return NextResponse.json(
        { found: !!found, checkedAt: checkedAt.toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
