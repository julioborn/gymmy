import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { enviarCorreoPagoCuota } from '@/utils/emailPagoCuota';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(request: NextRequest) {
    const authError = await requireAuth();
    if (authError) return authError;

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

        const alumnoActualizado = await Alumno.findByIdAndUpdate(
            alumnoId,
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
        );

        if (!alumnoActualizado) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        if (alumnoActualizado.email) {
            await enviarCorreoPagoCuota(alumnoActualizado.email, alumnoActualizado.nombre, {
                ...nuevoPago,
                fechaPago,
                tarifa: tarifaFinal,
                recargo: nuevoPago.recargo || 0,
            });
        }

        return NextResponse.json(alumnoActualizado, { status: 200 });

    } catch {
        return NextResponse.json({ message: 'Error interno al registrar el pago' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();

    const { id } = params;
    const { pagoId, nuevaFechaPago, nuevoMes } = await request.json();

    try {
        const alumno = await Alumno.findById(id);

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
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();

    const { id } = params;
    const { pagoId } = await request.json();

    try {
        const alumno = await Alumno.findById(id);

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
