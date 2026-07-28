import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('payment_id');
    if (!paymentId) return NextResponse.json({ ok: false });

    await connectMongoDB();

    // Buscar el alumno por external_reference usando la API de MP con cualquier token disponible
    // Primero obtenemos el pago para saber el gimnasio via external_reference
    // Necesitamos probar con todos los gimnasios que tengan token — en su lugar,
    // buscamos el alumno directamente y usamos su gimnasio para el token
    // external_reference = alumnoId, lo pasamos como param adicional
    const alumnoId = searchParams.get('alumno_id');
    if (!alumnoId) return NextResponse.json({ ok: false });

    const alumno = await Alumno.findById(alumnoId);
    if (!alumno) return NextResponse.json({ ok: false });

    const gym = await Gimnasio.findById(alumno.gimnasioId);
    if (!gym?.mercadopagoAccessToken) return NextResponse.json({ ok: false });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${gym.mercadopagoAccessToken}` },
    });
    if (!mpRes.ok) return NextResponse.json({ ok: false });

    const payment = await mpRes.json();
    if (payment.status !== 'approved') return NextResponse.json({ ok: false, status: payment.status });
    if (payment.external_reference !== String(alumno._id)) return NextResponse.json({ ok: false });

    const mesActual = MESES[new Date().getMonth()];
    const yaPago = alumno.pagos.some((p: { mes: string }) => p.mes.toLowerCase() === mesActual);
    if (yaPago) return NextResponse.json({ ok: true });

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

    return NextResponse.json({ ok: true });
}
