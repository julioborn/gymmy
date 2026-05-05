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

        if (diasRestantes === 0) {
            // All required sessions already exist — archive directly to historial
            const sorted = [...actividadesPrevias].sort(
                (a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
            );
            const completingActivity = sorted[Math.min(duracion - 1, sorted.length - 1)];
            const fechaFin = completingActivity ? new Date(completingActivity.fecha) : new Date(fechaInicio);

            const diasSemana = actividadesPrevias.map((a: any) => new Date(a.fecha).getDay());
            const conteoDias = diasSemana.reduce((acc: Record<number, number>, dia: number) => {
                acc[dia] = (acc[dia] || 0) + 1;
                return acc;
            }, {});
            const diasTexto = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const entries = Object.entries(conteoDias) as [string, number][];
            const diaMasFrecuente = entries.length > 0 ? entries.sort(([, a], [, b]) => b - a)[0][0] : null;
            const horarioMasFrecuente = diaMasFrecuente !== null ? diasTexto[Number(diaMasFrecuente)] : null;

            alumno.planEntrenamientoHistorial.push({
                fechaInicio: new Date(fechaInicio),
                fechaFin,
                duracion,
                asistenciasContadas: diasUsados,
                horarioMasFrecuente,
            });

            alumno.planEntrenamiento = undefined;
        } else {
            alumno.planEntrenamiento = {
                fechaInicio,
                duracion,
                diasRestantes,
                terminado: false,
            };
        }

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
