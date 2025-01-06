import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Recargo from '@/models/Recargo';
import { enviarCorreoPagoCuota } from '@/utils/emailPagoCuota';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    await connectMongoDB(); // Asegúrate de que la conexión a la base de datos esté activa.

    try {
        const { alumnoId, nuevoPago } = await request.json();

        // Validar campos requeridos
        if (!nuevoPago.mes || !nuevoPago.fechaPago || !nuevoPago.tarifa || nuevoPago.diasMusculacion === undefined) {
            return NextResponse.json({ message: 'Faltan campos requeridos para registrar el pago' }, { status: 400 });
        }

        // Convertir la fecha de pago
        const fechaPago = new Date(nuevoPago.fechaPago);
        const diaPago = fechaPago.getDate();

        let tarifaFinal = nuevoPago.tarifa;

        if (diaPago >= 10) {
            // Buscar el recargo en la base de datos
            const recargo = await Recargo.findOne();
            console.log("Recargo: " + recargo);
            if (recargo) {
                tarifaFinal += recargo.monto; // Sumar el recargo a la tarifa
                console.log(`Recargo aplicado: ${recargo.monto}, Tarifa final: ${tarifaFinal}`);
            } else {
                console.error('Recargo no configurado en la base de datos');
                return NextResponse.json({ message: 'Recargo no configurado en la base de datos' }, { status: 500 });
            }
        } else {
            console.log(`Día de pago ${diaPago} < 10, no se aplica recargo`);
        }

        // Actualizar el alumno con el nuevo pago
        const alumnoActualizado = await Alumno.findByIdAndUpdate(
            alumnoId,
            {
                $push: {
                    pagos: {
                        ...nuevoPago,
                        tarifa: tarifaFinal, // Tarifa con el recargo si aplica
                    },
                },
            },
            { new: true, runValidators: true }
        );

        if (!alumnoActualizado) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        // Opcional: Enviar un correo confirmando el pago
        if (alumnoActualizado.email) {
            await enviarCorreoPagoCuota(
                alumnoActualizado.email,
                alumnoActualizado.nombre,
                { ...nuevoPago, tarifa: tarifaFinal } // Enviar la tarifa final
            );
        }

        return NextResponse.json(alumnoActualizado, { status: 200 });
    } catch (error) {
        console.error('Error al registrar el pago:', error);
        return NextResponse.json({ message: 'Error interno al registrar el pago' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;
    const { pagoId, nuevaFechaPago, nuevoMes } = await request.json();

    try {
        const alumno = await Alumno.findById(id);

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        // Encontrar el pago a actualizar por su _id
        const pago = alumno.pagos.find((pago: { _id: string }) => pago._id.toString() === pagoId);

        if (!pago) {
            return new Response('Pago no encontrado', { status: 404 });
        }

        // Actualizar la fecha de pago y el mes si se proporcionan
        if (nuevaFechaPago) {
            pago.fechaPago = nuevaFechaPago;
        }

        if (nuevoMes) {
            pago.mes = nuevoMes;
        }

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error('Error actualizando pago:', error);
        return new Response('Error actualizando pago', { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;
    const { pagoId } = await request.json(); // Obtener el _id del pago a eliminar

    try {
        const alumno = await Alumno.findById(id);

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        // Filtrar el pago para eliminarlo por su _id
        alumno.pagos = alumno.pagos.filter((pago: { _id: string }) => pago._id.toString() !== pagoId);

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error('Error eliminando pago:', error);
        return new Response('Error eliminando pago', { status: 500 });
    }
}