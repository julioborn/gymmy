import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gimnasio from '@/models/Gimnasio';
import Tarifa from '@/models/Tarifa';
import { requireAlumnoAuth } from '@/lib/requireAuth';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export const dynamic = 'force-dynamic';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const APP_URL = process.env.NEXTAUTH_URL || 'https://www.gymmy.com.ar';

export async function POST() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    const alumnoId = auth.session.user.id;

    await connectMongoDB();

    const alumno = await Alumno.findById(alumnoId);
    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });

    const mesActual = MESES[new Date().getMonth()];
    const yaPago = alumno.pagos.some((p: { mes: string }) => p.mes.toLowerCase() === mesActual);
    if (yaPago) return NextResponse.json({ error: 'Ya pagaste este mes' }, { status: 400 });

    const gym = await Gimnasio.findById(alumno.gimnasioId);
    if (!gym?.mercadopagoAccessToken) {
        return NextResponse.json({ error: 'El gimnasio no tiene configurado MercadoPago' }, { status: 400 });
    }

    if (!alumno.diasEntrenaSemana) {
        return NextResponse.json({ error: 'No tenés días de entrenamiento configurados. Consultá con el gimnasio.' }, { status: 400 });
    }

    const tarifa = await Tarifa.findOne({ dias: alumno.diasEntrenaSemana, gimnasioId: alumno.gimnasioId });
    if (!tarifa) {
        return NextResponse.json({ error: 'No se encontró la tarifa correspondiente. Consultá con el gimnasio.' }, { status: 400 });
    }

    const client = new MercadoPagoConfig({ accessToken: gym.mercadopagoAccessToken });
    const preferenceClient = new Preference(client);

    const mesCapitalizado = mesActual.charAt(0).toUpperCase() + mesActual.slice(1);

    const preference = await preferenceClient.create({
        body: {
            items: [{
                id: `cuota-${alumnoId}-${mesActual}`,
                title: `Cuota ${mesCapitalizado} — ${gym.nombre}`,
                quantity: 1,
                unit_price: tarifa.valor,
                currency_id: 'ARS',
            }],
            external_reference: String(alumnoId),
            notification_url: `${APP_URL}/api/pagos/mp/webhook?gid=${String(alumno.gimnasioId)}`,
            back_urls: {
                success: `${APP_URL}/pago-resultado?status=ok`,
                failure: `${APP_URL}/pago-resultado?status=error`,
                pending: `${APP_URL}/pago-resultado?status=pendiente`,
            },
            auto_return: 'approved',
        },
    });

    return NextResponse.json({ init_point: preference.init_point });
}
