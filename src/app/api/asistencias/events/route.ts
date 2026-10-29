import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Types } from 'mongoose';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import AlumnoDePaso from '@/models/AlumnoDePaso';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.gimnasioId) return new Response('Unauthorized', { status: 401 });

    const gimnasioObjectId = new Types.ObjectId(String(token.gimnasioId));
    const encoder = new TextEncoder();
    let lastSignature: string | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            const send = (chunk: string) => {
                try { controller.enqueue(encoder.encode(chunk)); } catch { /* connection closed */ }
            };

            send(': connected\n\n');

            const poll = async () => {
                try {
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

                    if (lastSignature !== null && signature !== lastSignature) {
                        send('data: refresh\n\n');
                    }
                    lastSignature = signature;
                } catch { /* ignore DB errors during polling */ }
            };

            poll();
            const interval = setInterval(poll, 3000);
            const keepAlive = setInterval(() => send(': ping\n\n'), 20000);

            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                clearInterval(keepAlive);
                try { controller.close(); } catch { /* already closed */ }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
