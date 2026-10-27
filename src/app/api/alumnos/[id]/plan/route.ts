import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import PlanAlumno from '@/models/PlanAlumno';
import { requireGymAuth } from '@/lib/requireAuth';
import { sendGymNotif } from '@/lib/notifications';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;
    const { fechaInicio, duracion } = await request.json();

    try {
        const alumno = await Alumno.findOne({ _id: id, gimnasioId }).select('+fcmTokens');

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        if (!alumno.asistencia) alumno.asistencia = [];

        // Archive existing active embedded plan to historial before creating new one
        if (alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento.terminado) {
            const oldStart = new Date(alumno.planEntrenamiento.fechaInicio);
            const oldDuracion = alumno.planEntrenamiento.duracion || 0;
            const sesionesViejas = alumno.asistencia
                .filter((a: any) => a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= oldStart)
                .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            const lastIdx = oldDuracion > 0 && sesionesViejas.length >= oldDuracion ? oldDuracion - 1 : sesionesViejas.length - 1;
            const lastSession = sesionesViejas[lastIdx];
            const fechaFinViejo = lastSession
                ? new Date(lastSession.fecha)
                : new Date(new Date(fechaInicio).getTime() - 86400000);
            alumno.planEntrenamientoHistorial.push({
                fechaInicio: oldStart,
                fechaFin: fechaFinViejo,
                duracion: oldDuracion,
                asistenciasContadas: Math.min(sesionesViejas.length, oldDuracion || sesionesViejas.length),
            });
            alumno.planEntrenamiento = undefined;
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

        if (alumno.fcmTokens?.length) {
            sendGymNotif(gimnasioId?.toString() ?? '', alumno.fcmTokens, {
                title: '🏋️ Plan iniciado',
                body: `Tu plan de ${duracion} clases comenzó el ${new Date(fechaInicio).toLocaleDateString('es-AR')}. ¡A entrenar!`,
                url: '/mi-cuenta',
            }).catch(() => {});
        }

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error registrando el inicio del plan', { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;

    try {
        const alumno = await Alumno.findOneAndUpdate(
            { _id: id, gimnasioId },
            { $set: { 'planEntrenamiento.fechaInicio': null, 'planEntrenamiento.duracion': null, 'planEntrenamiento.diasRestantes': null, 'planEntrenamiento.terminado': false } },
            { new: true }
        );

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        // Deactivate exercise plans so the calendar no longer shows green
        await PlanAlumno.updateMany({ alumnoId: id, activo: true }, { $set: { activo: false } });

        return new Response(JSON.stringify({ message: 'Plan de entrenamiento eliminado correctamente' }), { status: 200 });
    } catch {
        return new Response('Error eliminando el plan de entrenamiento', { status: 500 });
    }
}
