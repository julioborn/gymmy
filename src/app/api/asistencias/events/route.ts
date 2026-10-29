import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Types } from 'mongoose';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import AlumnoDePaso from '@/models/AlumnoDePaso';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ArrivalItem = {
    tipo: 'alumno' | 'depaso';
    id: string;
    nombre: string;
    apellido: string;
    actividad: string;
    fecha: string;
};

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.gimnasioId) return new Response('Unauthorized', { status: 401 });

    const gimnasioId = String(token.gimnasioId);
    const gimnasioObjectId = new Types.ObjectId(gimnasioId);
    const encoder = new TextEncoder();
    let lastCheck = new Date(Date.now() - 10000);

    const stream = new ReadableStream({
        async start(controller) {
            const send = (chunk: string) => {
                try { controller.enqueue(encoder.encode(chunk)); } catch { /* connection closed */ }
            };

            send(': connected\n\n');

            const poll = async () => {
                try {
                    await connectMongoDB();
                    const since = lastCheck;

                    const [nuevosAlumnos, nuevosDepaso] = await Promise.all([
                        Alumno.aggregate([
                            { $match: { gimnasioId: gimnasioObjectId, 'asistencia.fecha': { $gt: since } } },
                            { $unwind: '$asistencia' },
                            { $match: { 'asistencia.fecha': { $gt: since }, 'asistencia.presente': true } },
                            { $project: { _id: 1, nombre: 1, apellido: 1, actividad: '$asistencia.actividad', fecha: '$asistencia.fecha' } },
                        ]),
                        AlumnoDePaso.find(
                            { gimnasioId, fecha: { $gt: since } },
                            { nombre: 1, apellido: 1, actividad: 1, fecha: 1 },
                        ).lean(),
                    ]);

                    const items: ArrivalItem[] = [
                        ...nuevosAlumnos.map((a: any) => ({
                            tipo: 'alumno' as const, id: String(a._id), nombre: a.nombre, apellido: a.apellido,
                            actividad: a.actividad ?? '', fecha: new Date(a.fecha).toISOString(),
                        })),
                        ...nuevosDepaso.map((d: any) => ({
                            tipo: 'depaso' as const, id: String(d._id), nombre: d.nombre, apellido: d.apellido,
                            actividad: d.actividad ?? '', fecha: new Date(d.fecha).toISOString(),
                        })),
                    ].sort((x, y) => new Date(x.fecha).getTime() - new Date(y.fecha).getTime());

                    if (items.length > 0) {
                        const maxFecha = items.reduce((m, it) => Math.max(m, new Date(it.fecha).getTime()), 0);
                        lastCheck = new Date(maxFecha);
                        send(`event: asistencia\ndata: ${JSON.stringify(items)}\n\n`);
                    }
                } catch { /* ignore DB errors during polling */ }
            };

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
