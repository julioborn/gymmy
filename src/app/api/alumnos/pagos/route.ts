import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { NextResponse } from 'next/server';

// Interfaz para el pago
interface Pago {
    mes: string;
    fechaPago: Date;
    _id: string;
}

// Método POST para registrar el pago de un alumno
export async function POST(request: Request) {
    try {
        await connectMongoDB();

        const { alumnoId, nuevoPago } = await request.json();

        const alumno = await Alumno.findById(alumnoId);

        if (!alumno) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        alumno.pagos.push(nuevoPago);
        await alumno.save();

        return NextResponse.json(alumno, { status: 200 });
    } catch (error) {
        console.error('Error al registrar el pago:', error);
        return NextResponse.json({ message: 'Error al registrar el pago' }, { status: 500 });
    }
}

// Método DELETE para eliminar un pago de un alumno
// export async function DELETE(request: Request, { params }: { params: { id: string } }) {
//     try {
//         await connectMongoDB();

//         const { id } = params;
//         const { mes } = await request.json(); // Obtenemos el mes del pago a eliminar

//         const alumno = await Alumno.findById(id);

//         if (!alumno) {
//             return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
//         }

//         // Tipamos explícitamente el array de pagos
//         alumno.pagos = alumno.pagos.filter((pago: Pago) => pago.mes !== mes);

//         await alumno.save();

//         return NextResponse.json(alumno, { status: 200 });
//     } catch (error) {
//         console.error('Error eliminando pago:', error);
//         return NextResponse.json({ message: 'Error eliminando el pago' }, { status: 500 });
//     }
// }

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