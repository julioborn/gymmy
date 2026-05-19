import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { enviarCorreoPlanTerminado } from '@/utils/emailPlan';
import { requireGymAuth } from '@/lib/requireAuth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;
    const { fecha, presente, actividad } = await request.json();

    try {
        const alumno = await Alumno.findOne({ _id: id, gimnasioId });
        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        if (!alumno.asistencia) {
            alumno.asistencia = [];
        }

        const fechaAsistencia = new Date(fecha).toISOString().split('T')[0];

        const asistenciaExistente = alumno.asistencia.find(
            (asistencia: { fecha: string; actividad: string }) => {
                const fechaRegistrada = new Date(asistencia.fecha).toISOString().split('T')[0];
                return fechaRegistrada === fechaAsistencia && asistencia.actividad === actividad;
            }
        );

        if (asistenciaExistente) {
            return new Response('Asistencia ya registrada para esta actividad en el día', { status: 400 });
        }

        alumno.asistencia.push({ fecha, presente, actividad });

        if (
            actividad === "Musculación" &&
            presente &&
            alumno.planEntrenamiento &&
            !alumno.planEntrenamiento.terminado
        ) {
            const fechaInicio = new Date(alumno.planEntrenamiento.fechaInicio as Date);

            const asistenciasValidas = alumno.asistencia.filter(
                (a: any) =>
                    a.actividad === "Musculación" &&
                    a.presente &&
                    new Date(a.fecha) >= fechaInicio
            );

            if (asistenciasValidas.length >= alumno.planEntrenamiento.duracion!) {
                alumno.planEntrenamiento.terminado = true;

                const fechaFin = new Date(fecha);

                const diasSemana = asistenciasValidas.map((a: { fecha: Date }) =>
                    new Date(a.fecha).getDay()
                );

                const conteoDias = diasSemana.reduce(
                    (acc: Record<string, number>, dia: number) => {
                        const clave = dia.toString();
                        acc[clave] = (acc[clave] || 0) + 1;
                        return acc;
                    },
                    {}
                );

                const diasTexto = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                const diaMasFrecuente = (Object.entries(conteoDias) as [string, number][])
                    .reduce((a, b) => (a[1] > b[1] ? a : b))[0];
                const diaTexto = diasTexto[parseInt(diaMasFrecuente)];

                alumno.planEntrenamientoHistorial.push({
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFin,
                    duracion: asistenciasValidas.length,
                    asistenciasContadas: asistenciasValidas.length,
                    horarioMasFrecuente: diaTexto,
                });

                if (alumno.email) {
                    await enviarCorreoPlanTerminado(
                        alumno.email,
                        alumno.nombre,
                        alumno.asistencia,
                        {
                            fechaInicio: fechaInicio.toISOString(),
                            duracion: alumno.planEntrenamiento.duracion!,
                        }
                    );
                }
            }
        }

        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error registrando asistencia', { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;
    const { fecha, actividad } = await request.json();

    try {
        const alumno = await Alumno.findOne({ 'asistencia._id': id, gimnasioId });
        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        const asistencia = alumno.asistencia.find(
            (asistencia: { _id: string }) => asistencia._id.toString() === id
        );

        if (!asistencia) {
            return new Response('Asistencia no encontrada', { status: 404 });
        }

        const nuevaFecha = new Date(fecha).toISOString().split('T')[0];

        const asistenciaDuplicada = alumno.asistencia.find(
            (a: { _id: string; fecha: string; actividad: string }) => {
                const fechaExistente = new Date(a.fecha).toISOString().split('T')[0];
                return a._id.toString() !== id && fechaExistente === nuevaFecha && a.actividad === actividad;
            }
        );

        if (asistenciaDuplicada) {
            return new Response('Ya existe una asistencia para esta actividad en esa fecha', { status: 400 });
        }

        asistencia.fecha = fecha;
        asistencia.actividad = actividad;

        await alumno.save();
        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error actualizando asistencia', { status: 500 });
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
            { 'asistencia._id': id, gimnasioId },
            { $pull: { asistencia: { _id: id } } },
            { new: true }
        );

        if (!alumno) {
            return new Response(JSON.stringify({ error: 'Asistencia no encontrada' }), { status: 404 });
        }

        return new Response(JSON.stringify({ message: 'Asistencia eliminada correctamente' }), { status: 200 });
    } catch {
        return new Response(JSON.stringify({ error: 'Error al eliminar la asistencia' }), { status: 500 });
    }
}
