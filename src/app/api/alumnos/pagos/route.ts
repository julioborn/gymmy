import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { NextResponse } from 'next/server';

// Método POST para registrar el pago de un alumno
export async function POST(request: Request) {
    try {
        // Conectar a la base de datos
        await connectMongoDB();

        // Obtener el cuerpo de la solicitud
        const { alumnoId, nuevoPago } = await request.json();

        // Buscar el alumno por ID
        const alumno = await Alumno.findById(alumnoId);

        if (!alumno) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        // Agregar el nuevo pago al array de pagos del alumno
        alumno.pagos.push(nuevoPago);

        // Guardar el alumno actualizado en la base de datos
        await alumno.save();

        // Retornar la respuesta con el alumno actualizado
        return NextResponse.json(alumno, { status: 200 });
    } catch (error) {
        console.error('Error al registrar el pago:', error);
        return NextResponse.json({ message: 'Error al registrar el pago' }, { status: 500 });
    }
}
