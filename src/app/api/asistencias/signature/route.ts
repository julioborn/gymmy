import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Types } from 'mongoose';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import AlumnoDePaso from '@/models/AlumnoDePaso';

export const dynamic = 'force-dynamic';

// Reemplaza al viejo SSE de /api/asistencias/events: en vez de una conexión
// persistente de hasta 60s reconectándose sola, el cliente pregunta cada
// 15s con un fetch corto y compara la firma devuelta contra la anterior.
export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.gimnasioId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const gimnasioObjectId = new Types.ObjectId(String(token.gimnasioId));
    await connectMongoDB();

    // Semana visible (lunes a sábado 00:00, hora Argentina)
    const ARG = -3 * 60 * 60 * 1000;
    const nowArg = new Date(Date.now() + ARG);
    const dow = nowArg.getUTCDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const monday = new Date(Date.UTC(nowArg.getUTCFullYear(), nowArg.getUTCMonth(), nowArg.getUTCDate() - daysToMon));
    const saturday = new Date(monday.getTime() + 5 * 86400000);

    const [alumnosRows, depasoRows] = await Promise.all([
        Alumno.aggregate([
            { $match: { gimnasioId: gimnasioObjectId } },
            { $project: { asistencia: { $filter: { input: '$asistencia', as: 'a', cond: { $and: [
                { $eq: ['$$a.presente', true] },
                { $gte: ['$$a.fecha', monday] },
                { $lt: ['$$a.fecha', saturday] },
            ] } } } } },
            { $unwind: '$asistencia' },
            { $project: { _id: 0, id: '$asistencia._id', fecha: '$asistencia.fecha' } },
        ]),
        AlumnoDePaso.find(
            { gimnasioId: gimnasioObjectId, fecha: { $gte: monday, $lt: saturday } },
            { fecha: 1 },
        ).lean(),
    ]);

    // Firma del estado actual: cualquier alta, baja o edición la cambia.
    const signature = [
        ...alumnosRows.map((r: any) => `a:${r.id}:${new Date(r.fecha).getTime()}`),
        ...depasoRows.map((r: any) => `d:${r._id}:${new Date(r.fecha).getTime()}`),
    ].sort().join('|');

    return NextResponse.json({ signature }, { headers: { 'Cache-Control': 'no-store' } });
}
