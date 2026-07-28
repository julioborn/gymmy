import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.gimnasioId) return new Response('Unauthorized', { status: 401 });

    const gimnasioId = String(token.gimnasioId);
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
                    const found = await Alumno.exists({
                        gimnasioId,
                        'pagos.fechaPago': { $gt: lastCheck },
                    });
                    if (found) {
                        lastCheck = new Date();
                        send('data: pago\n\n');
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
