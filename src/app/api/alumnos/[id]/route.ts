import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

// Obtener el historial de asistencia del alumno
export async function GET(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;

    try {
        const alumno = await Alumno.findById(id);
        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error('Error al obtener el alumno:', error);
        return new Response('Error al obtener el alumno', { status: 500 });
    }
}

// Actualizar asistencia
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params; // Obtiene el id del alumno desde los parámetros de la ruta
    const { dia, asistencia } = await request.json(); // Obtiene el día y el nuevo estado de asistencia

    try {
        const alumno = await Alumno.findByIdAndUpdate(
            id,
            { $set: { [`asistencia.${dia}`]: asistencia } }, // Actualiza el estado de asistencia
            { new: true } // Devuelve el documento actualizado
        );

        if (!alumno) {
            return new Response('Alumno not found', { status: 404 });
        }

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response('Error updating alumno', { status: 500 });
    }
}
