import Alumno from '@/models/Alumno';
import connectMongoDB from '../../../lib/mongodb';

// GET alumnos (buscar todos o por DNI si se proporciona)
export async function GET(request: Request) {
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');

    try {
        let alumnos;

        if (dni) {
            // Si se proporciona el DNI, buscar el alumno específico
            alumnos = await Alumno.findOne({ dni });
        } else {
            // Si no se proporciona DNI, obtener todos los alumnos
            alumnos = await Alumno.find();
        }

        return new Response(JSON.stringify(alumnos), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response('Error fetching alumnos', { status: 500 });
    }
}

// Crear alumno
export async function POST(request: Request) {
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
        horaExactaEntrenamiento, // 👈 AGREGADO
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
            horaExactaEntrenamiento: horaExactaEntrenamiento || null, // 👈 AGREGADO
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
        });

        await nuevoAlumno.save();
        return new Response(JSON.stringify(nuevoAlumno), { status: 201 });
    } catch (error) {
        console.error('Error creando alumno:', error);
        return new Response('Error creando alumno', { status: 500 });
    }
}

// Editar alumno
export async function PUT(request: Request) {
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
            horaExactaEntrenamiento, // 👈 AGREGADO
            historialDeportivo,
            historialDeVida,
            objetivos,
            patologias,
        } = await request.json();

        const alumnoActualizado = await Alumno.findByIdAndUpdate(
            id,
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
                horaExactaEntrenamiento: horaExactaEntrenamiento || null, // 👈 AGREGADO
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
    } catch (error) {
        console.error('Error actualizando alumno:', error);
        return new Response('Error actualizando alumno', { status: 500 });
    }
}

// Eliminar alumno
export async function DELETE(request: Request) {
    await connectMongoDB();

    try {
        const { id } = await request.json(); // Obtenemos el ID del alumno a eliminar

        const alumnoEliminado = await Alumno.findByIdAndDelete(id);

        if (!alumnoEliminado) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        return new Response(JSON.stringify(alumnoEliminado), { status: 200 });
    } catch (error) {
        console.error('Error eliminando alumno:', error);
        return new Response('Error eliminando alumno', { status: 500 });
    }
}