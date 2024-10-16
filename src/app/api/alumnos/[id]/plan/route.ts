import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;
    const { fechaInicio, duracion } = await request.json();

    try {
        const alumno = await Alumno.findById(id);

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        // Actualizar el plan de entrenamiento
        alumno.planEntrenamiento.fechaInicio = fechaInicio;
        alumno.planEntrenamiento.duracion = duracion;

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response('Error actualizando el plan de entrenamiento', { status: 500 });
    }
}
