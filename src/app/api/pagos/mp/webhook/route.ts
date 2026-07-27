import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const gimnasioId = searchParams.get('gid');

        const body = await req.json().catch(() => ({}));

        if (body.type !== 'payment' || !body.data?.id) {
            return NextResponse.json({ ok: true });
        }

        if (!gimnasioId) return NextResponse.json({ ok: true });

        await connectMongoDB();

        const gym = await Gimnasio.findById(gimnasioId);
        if (!gym?.mercadopagoAccessToken) return NextResponse.json({ ok: true });

        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
            headers: { Authorization: `Bearer ${gym.mercadopagoAccessToken}` },
        });
        if (!mpRes.ok) return NextResponse.json({ ok: true });

        const payment = await mpRes.json();
        if (payment.status !== 'approved') return NextResponse.json({ ok: true });

        const alumnoId = payment.external_reference;
        if (!alumnoId) return NextResponse.json({ ok: true });

        const alumno = await Alumno.findById(alumnoId);
        if (!alumno) return NextResponse.json({ ok: true });

        const mesActual = MESES[new Date().getMonth()];
        const yaPago = alumno.pagos.some((p: { mes: string }) => p.mes.toLowerCase() === mesActual);
        if (yaPago) return NextResponse.json({ ok: true });

        await Alumno.findByIdAndUpdate(alumnoId, {
            $push: {
                pagos: {
                    mes: mesActual,
                    fechaPago: new Date(),
                    tarifa: payment.transaction_amount,
                    diasMusculacion: alumno.diasEntrenaSemana || 0,
                    metodoPago: 'mercadopago',
                    recargo: 0,
                },
            },
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('MP webhook error:', err);
        return NextResponse.json({ ok: true });
    }
}

export async function GET() {
    return NextResponse.json({ ok: true });
}
