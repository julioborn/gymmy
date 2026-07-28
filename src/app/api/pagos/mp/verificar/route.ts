import { NextRequest, NextResponse } from 'next/server';
import { requireAlumnoAuth } from '@/lib/requireAuth';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export async function GET(req: NextRequest) {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('payment_id');
    if (!paymentId) return NextResponse.json({ ok: false, error: 'Sin payment_id' }, { status: 400 });

    await connectMongoDB();

    const alumno = await Alumno.findById(auth.session.user.id);
    if (!alumno) return NextResponse.json({ ok: false }, { status: 404 });

    const gym = await Gimnasio.findById(alumno.gimnasioId);
    if (!gym?.mercadopagoAccessToken) return NextResponse.json({ ok: false }, { status: 400 });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${gym.mercadopagoAccessToken}` },
    });
    if (!mpRes.ok) return NextResponse.json({ ok: false }, { status: 400 });

    const payment = await mpRes.json();

    if (payment.status !== 'approved') return NextResponse.json({ ok: false, status: payment.status });
    if (payment.external_reference !== String(alumno._id)) return NextResponse.json({ ok: false, error: 'Pago no corresponde' }, { status: 403 });

    const mesActual = MESES[new Date().getMonth()];
    const yaPago = alumno.pagos.some((p: { mes: string }) => p.mes.toLowerCase() === mesActual);
    if (yaPago) return NextResponse.json({ ok: true, alreadyRegistered: true });

    await Alumno.findByIdAndUpdate(alumno._id, {
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

    return NextResponse.json({ ok: true, registered: true });
}
