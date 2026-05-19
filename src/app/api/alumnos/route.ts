import Alumno from '@/models/Alumno';
import connectMongoDB from '../../../lib/mongodb';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET(request: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');

    try {
        const alumnos = dni
            ? await Alumno.findOne({ dni, gimnasioId })
            : await Alumno.find({ gimnasioId });
        return new Response(JSON.stringify(alumnos), { status: 200 });
    } catch {
        return new Response('Error fetching alumnos', { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const {
        nombre,
        apellido,
        fechaNacimiento,
        dni,
        telefono,
        email,
        diasEntrenaSemana,
        fechaInicio,
        horarioEntrenamiento,
        horaExactaEntrenamiento,
        historialDeportivo,
        historialDeVida,
        objetivos,
        patologias,
    } = await request.json();

    try {
        const nuevoAlumno = new Alumno({
            nombre,
            apellido,
            fechaNacimiento,
            dni,
            telefono,
            email,
            diasEntrenaSemana: diasEntrenaSemana || null,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
            horarioEntrenamiento: horarioEntrenamiento || null,
            horaExactaEntrenamiento: horaExactaEntrenamiento || null,
            historialDeportivo: historialDeportivo || "",
            historialDeVida: historialDeVida || "",
            objetivos: objetivos || "",
            patologias: patologias || "",
            asistencia: [],
            pagos: [],
            planEntrenamiento: {
                fechaInicio: null,
                duracion: null,
                diasRestantes: null,
                terminado: false,
            },
            gimnasioId,
        });

        await nuevoAlumno.save();
        return new Response(JSON.stringify(nuevoAlumno), { status: 201 });
    } catch {
        return new Response('Error creando alumno', { status: 500 });
    }
}

export async function PUT(request: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const {
            id,
            nombre,
            apellido,
            fechaNacimiento,
            dni,
            telefono,
            email,
            diasEntrenaSemana,
            fechaInicio,
            horarioEntrenamiento,
            horaExactaEntrenamiento,
            historialDeportivo,
            historialDeVida,
            objetivos,
            patologias,
        } = await request.json();

        const alumnoActualizado = await Alumno.findOneAndUpdate(
            { _id: id, gimnasioId },
            {
                nombre,
                apellido,
                fechaNacimiento,
                dni,
                telefono,
                email,
                diasEntrenaSemana,
                fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
                horarioEntrenamiento: horarioEntrenamiento || null,
                horaExactaEntrenamiento: horaExactaEntrenamiento || null,
                historialDeportivo: historialDeportivo || '',
                historialDeVida: historialDeVida || '',
                objetivos: objetivos || '',
                patologias: patologias || '',
            },
            { new: true }
        );

        if (!alumnoActualizado) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        return new Response(JSON.stringify(alumnoActualizado), { status: 200 });
    } catch {
        return new Response('Error actualizando alumno', { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const { id } = await request.json();

        const alumnoEliminado = await Alumno.findOneAndDelete({ _id: id, gimnasioId });

        if (!alumnoEliminado) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        return new Response(JSON.stringify(alumnoEliminado), { status: 200 });
    } catch {
        return new Response('Error eliminando alumno', { status: 500 });
    }
}
