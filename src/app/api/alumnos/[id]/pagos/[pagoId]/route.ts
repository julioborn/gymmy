import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { NextResponse } from 'next/server';

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
        console.log(`Pagos después de eliminar: ${JSON.stringify(alumno.pagos)}`);

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
        const { nuevaFechaPago } = await request.json();

        const alumno = await Alumno.findById(id);
        if (!alumno) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        // Usar el tipo Pago para definir el array
        const pago = alumno.pagos.find((pago: Pago) => pago._id === pagoId);
        if (!pago) {
            return NextResponse.json({ message: 'Pago no encontrado' }, { status: 404 });
        }

        pago.fechaPago = nuevaFechaPago;

        await alumno.save();

        return NextResponse.json(alumno, { status: 200 });
    } catch (error) {
        console.error('Error actualizando pago:', error);
        return NextResponse.json({ message: 'Error actualizando el pago' }, { status: 500 });
    }
}
