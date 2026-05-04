import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const authError = await requireAuth();
    if (authError) return authError;

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

        const actividadesPrevias = alumno.asistencia.filter(
            (asistencia: { fecha: string; actividad: string; presente: boolean }) =>
                asistencia.actividad === 'Musculación' &&
                asistencia.presente &&
                new Date(asistencia.fecha) >= new Date(fechaInicio)
        );

        const diasUsados = actividadesPrevias.length;
        const diasRestantes = Math.max(duracion - diasUsados, 0);

        alumno.planEntrenamiento = {
            fechaInicio,
            duracion,
            diasRestantes,
            terminado: diasRestantes === 0,
        };

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error registrando el inicio del plan', { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();

    const { id } = params;

    try {
        const alumno = await Alumno.findById(id);

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        alumno.planEntrenamiento = undefined;

        await alumno.save();

        return new Response(JSON.stringify({ message: 'Plan de entrenamiento eliminado correctamente' }), { status: 200 });
    } catch {
        return new Response('Error eliminando el plan de entrenamiento', { status: 500 });
    }
}
