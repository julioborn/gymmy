import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

// Crear asistencia
export async function POST(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;
    const { fecha, presente, actividad } = await request.json();

    try {
        const alumno = await Alumno.findById(id);
        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        if (!alumno.asistencia) {
            alumno.asistencia = [];
        }

        // Verificar si ya existe una asistencia para esa fecha y actividad
        const asistenciaExistente = alumno.asistencia.find(
            (asistencia: { fecha: string; actividad: string }) =>
                asistencia.fecha === fecha && asistencia.actividad === actividad
        );

        if (asistenciaExistente) {
            return new Response('Asistencia ya registrada para esta actividad en el día', { status: 400 });
        }

        // Agregar nueva asistencia
        alumno.asistencia.push({ fecha, presente, actividad });
        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        return new Response('Error registrando asistencia', { status: 500 });
    }
}

// Editar asistencia - ajusta para recibir solo el id de la asistencia
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params; // ID de la asistencia
    const { fecha, actividad } = await request.json();

    try {
        const alumno = await Alumno.findOne({ 'asistencia._id': id });
        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        const asistencia = alumno.asistencia.find(
            (asistencia: { _id: string }) => asistencia._id.toString() === id
        );

        if (!asistencia) {
            return new Response('Asistencia no encontrada', { status: 404 });
        }

        // Actualizar la asistencia
        asistencia.fecha = fecha;
        asistencia.actividad = actividad;

        await alumno.save();
        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error('Error actualizando asistencia:', error);
        return new Response('Error actualizando asistencia', { status: 500 });
    }
}

// Eliminar asistencia
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();
    const { id } = params;

    try {
        const alumno = await Alumno.findOneAndUpdate(
            { 'asistencia._id': id },
            { $pull: { asistencia: { _id: id } } },
            { new: true }
        );

        if (!alumno) {
            return new Response(JSON.stringify({ error: 'Asistencia no encontrada' }), { status: 404 });
        }

        return new Response(JSON.stringify({ message: 'Asistencia eliminada correctamente' }), { status: 200 });
    } catch (error) {
        console.error("Error eliminando la actividad:", error);
        return new Response(JSON.stringify({ error: 'Error al eliminar la asistencia' }), { status: 500 });
    }
}
