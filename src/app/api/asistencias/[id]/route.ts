import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { enviarCorreoPlanTerminado } from '@/utils/emailPlan';

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

        // Comparar solo la parte de la fecha (sin hora)
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

        // Agregar nueva asistencia
        alumno.asistencia.push({ fecha, presente, actividad });

        // Reducir días restantes si es "Musculación" y está presente
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
                // Marcar como terminado
                alumno.planEntrenamiento.terminado = true;

                // Calcular fecha fin
                const fechaFin = new Date(fecha);

                // Calcular día más frecuente
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

                // Agregar al historial
                alumno.planEntrenamientoHistorial.push({
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFin,
                    duracion: asistenciasValidas.length,
                    asistenciasContadas: asistenciasValidas.length,
                    horarioMasFrecuente: diaTexto,
                });

                // Enviar mail si tiene email
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
    } catch (error) {
        console.error('Error registrando asistencia:', error);
        return new Response('Error registrando asistencia', { status: 500 });
    }
}

// Editar asistencia - ajusta para recibir solo el id de la asistencia
// Editar asistencia
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;
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

        // Comparar solo la parte de la fecha
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