import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();

    const { id } = params;
    const { fecha, presente, actividad } = await request.json();

    try {
        const alumno = await Alumno.findById(id);
        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        // Asegúrate de que el array asistencia existe
        if (!alumno.asistencia) {
            alumno.asistencia = [];
        }

        // Verificar si el alumno ya tiene una asistencia para la misma actividad en el día
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Solo la fecha sin horas
        const asistenciaExistente = alumno.asistencia.find(
            (asistencia: { fecha: string | number | Date; actividad: string }) => {
                const fechaAsistencia = new Date(asistencia.fecha);
                fechaAsistencia.setHours(0, 0, 0, 0);
                return (
                    fechaAsistencia.getTime() === hoy.getTime() &&
                    asistencia.actividad === actividad
                );
            }
        );

        if (asistenciaExistente) {
            return new Response('Asistencia ya registrada para esta actividad en el día', { status: 400 });
        }

        // Agregar nueva asistencia con la actividad
        alumno.asistencia.push({ fecha, presente, actividad });
        await alumno.save();

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response('Error registrando asistencia', { status: 500 });
    }
}

