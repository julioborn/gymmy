import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

// export async function POST(request: Request, { params }: { params: { id: string } }) {
//     await connectMongoDB();

//     const { id } = params;
//     const { fechaInicio, duracion } = await request.json();

//     try {
//         const alumno = await Alumno.findById(id);

//         if (!alumno) {
//             return new Response('Alumno no encontrado', { status: 404 });
//         }

//         // Actualizar el plan de entrenamiento con días restantes
//         alumno.planEntrenamiento = {
//             fechaInicio,
//             duracion,
//             diasRestantes: duracion, // Iniciar con la duración completa
//             terminado: false,        // Plan no terminado al inicio
//         };

//         await alumno.save();

//         return new Response(JSON.stringify(alumno), { status: 200 });
//     } catch (error) {
//         console.error('Error actualizando el plan de entrenamiento:', error);
//         return new Response('Error actualizando el plan de entrenamiento', { status: 500 });
//     }
// }

export async function POST(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;
    const { fechaInicio, duracion } = await request.json();

    try {
        const alumno = await Alumno.findById(id);

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        if (!alumno.asistencia) {
            alumno.asistencia = [];
        }

        // Filtrar actividades de "Musculación" antes del inicio del plan
        const actividadesPrevias = alumno.asistencia.filter(
            (asistencia: { fecha: string; actividad: string; presente: boolean }) =>
                asistencia.actividad === 'Musculación' &&
                asistencia.presente &&
                new Date(asistencia.fecha) >= new Date(fechaInicio)
        );

        // Calcular los días restantes teniendo en cuenta las actividades previas
        const diasUsados = actividadesPrevias.length;
        const diasRestantes = Math.max(duracion - diasUsados, 0);

        // Guardar el plan de entrenamiento actualizado
        alumno.planEntrenamiento = {
            fechaInicio,
            duracion,
            diasRestantes,
            terminado: diasRestantes === 0,
        };

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error('Error registrando el inicio del plan:', error);
        return new Response('Error registrando el inicio del plan', { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;

    try {
        const alumno = await Alumno.findById(id);

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        // Eliminar el plan de entrenamiento
        alumno.planEntrenamiento = undefined; // o null

        await alumno.save();

        return new Response(JSON.stringify({ message: 'Plan de entrenamiento eliminado correctamente' }), { status: 200 });
    } catch (error) {
        console.error('Error eliminando el plan de entrenamiento:', error);
        return new Response('Error eliminando el plan de entrenamiento', { status: 500 });
    }
}