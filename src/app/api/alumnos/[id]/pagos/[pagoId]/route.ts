import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Definir el tipo Pago
interface Pago {
    _id: string;
    mes: string;
    fechaPago: string;
}

// Método DELETE para eliminar un pago de un alumno
export async function DELETE(request: Request, { params }: { params: { id: string; pagoId: string } }) {
    try {
        await connectMongoDB();

        const { id, pagoId } = params;
        console.log(`Buscando alumno con id: ${id} para eliminar el pago con id: ${pagoId}`);

        const alumno = await Alumno.findById(id);
        if (!alumno) {
            console.log('Alumno no encontrado');
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        // Usar el tipo Pago para definir el array
        alumno.pagos = alumno.pagos.filter((pago: Pago) => pago._id.toString() !== pagoId);
        //console.log(`Pagos después de eliminar: ${JSON.stringify(alumno.pagos)}`);

        await alumno.save();
        console.log('Pago eliminado y cambios guardados en la base de datos');

        return NextResponse.json(alumno, { status: 200 });
    } catch (error) {
        console.error('Error eliminando pago:', error);
        return NextResponse.json({ message: 'Error eliminando el pago' }, { status: 500 });
    }
}

// Método PUT para actualizar un pago de un alumno
export async function PUT(request: Request, { params }: { params: { id: string; pagoId: string } }) {
    try {
        await connectMongoDB();

        const { id, pagoId } = params;
        const { nuevaFechaPago, tarifa, diasMusculacion } = await request.json();

        if (!nuevaFechaPago || !tarifa || !diasMusculacion) {
            return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const alumno = await Alumno.findById(id);
        if (!alumno) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        // Convertir el pagoId en ObjectId para la comparación
        const pagoObjectId = new mongoose.Types.ObjectId(pagoId);

        // Encontrar el pago correspondiente
        const pago = alumno.pagos.find((pago: any) => pago._id.equals(pagoObjectId));
        if (!pago) {
            return NextResponse.json({ message: 'Pago no encontrado' }, { status: 404 });
        }

        // Actualizar los valores del pago
        pago.fechaPago = nuevaFechaPago;
        pago.tarifa = tarifa;
        pago.diasMusculacion = diasMusculacion;

        // Guardar los cambios
        await alumno.save();

        return NextResponse.json(alumno, { status: 200 });
    } catch (error) {
        console.error('Error actualizando pago:', error);
        return NextResponse.json({ message: 'Error actualizando el pago' }, { status: 500 });
    }
}
