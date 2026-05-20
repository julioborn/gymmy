import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { NextRequest, NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import { sendToTokens, notifyOwners } from '@/lib/notifications';

export async function POST(request: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const { alumnoId, nuevoPago } = await request.json();

        if (
            !nuevoPago.mes ||
            !nuevoPago.fechaPago ||
            !nuevoPago.tarifa ||
            nuevoPago.diasMusculacion === undefined ||
            !nuevoPago.metodoPago
        ) {
            return NextResponse.json(
                { message: 'Faltan campos requeridos para registrar el pago' },
                { status: 400 }
            );
        }

        const fechaPago = new Date(nuevoPago.fechaPago);
        const montoRecargo = nuevoPago.recargo || 0;
        const tarifaFinal = nuevoPago.tarifa + montoRecargo;

        const alumnoActualizado = await Alumno.findOneAndUpdate(
            { _id: alumnoId, gimnasioId },
            {
                $push: {
                    pagos: {
                        ...nuevoPago,
                        fechaPago,
                        tarifa: tarifaFinal,
                        recargo: montoRecargo,
                    },
                },
            },
            { new: true, runValidators: true }
        ).select('+fcmTokens');

        if (!alumnoActualizado) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        console.log('[Pagos] fcmTokens:', alumnoActualizado.fcmTokens);
        if (alumnoActualizado.fcmTokens?.length) {
            const mesLabel = nuevoPago.mes ? ` de ${nuevoPago.mes}` : '';
            const result = await sendToTokens(alumnoActualizado.fcmTokens, {
                title: '✅ Pago registrado',
                body: `Tu cuota${mesLabel} fue registrada correctamente. Total: $${tarifaFinal}`,
                url: '/mi-cuenta',
            });
            console.log('[Pagos] FCM result:', JSON.stringify(result));
            const invalidos = alumnoActualizado.fcmTokens.filter((_, i) =>
                result?.responses[i]?.error?.code === 'messaging/registration-token-not-registered'
            );
            if (invalidos.length) {
                await Alumno.updateOne({ _id: alumnoId }, { $pull: { fcmTokens: { $in: invalidos } } });
            }
        }

        notifyOwners(gimnasioId.toString(), {
            title: '💰 Pago recibido',
            body: `${alumnoActualizado.nombre} ${alumnoActualizado.apellido} abonó su cuota${nuevoPago.mes ? ` de ${nuevoPago.mes}` : ''}. Total: $${tarifaFinal}`,
            url: '/',
        }).catch(() => {});

        return NextResponse.json(alumnoActualizado, { status: 200 });

    } catch {
        return NextResponse.json({ message: 'Error interno al registrar el pago' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;
    const { pagoId, nuevaFechaPago, nuevoMes } = await request.json();

    try {
        const alumno = await Alumno.findOne({ _id: id, gimnasioId });

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        const pago = alumno.pagos.find((pago: { _id: string }) => pago._id.toString() === pagoId);

        if (!pago) {
            return new Response('Pago no encontrado', { status: 404 });
        }

        if (nuevaFechaPago) pago.fechaPago = nuevaFechaPago;
        if (nuevoMes) pago.mes = nuevoMes;

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error actualizando pago', { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;
    const { pagoId } = await request.json();

    try {
        const alumno = await Alumno.findOne({ _id: id, gimnasioId });

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        alumno.pagos = alumno.pagos.filter((pago: { _id: string }) => pago._id.toString() !== pagoId);

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error eliminando pago', { status: 500 });
    }
}
