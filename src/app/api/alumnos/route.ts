import Alumno from '@/models/Alumno';
import PlanAlumno from '@/models/PlanAlumno';
import connectMongoDB from '../../../lib/mongodb';
import mongoose from 'mongoose';
import { requireGymAuth } from '@/lib/requireAuth';
import { notifyOwners } from '@/lib/notifications';

export async function GET(request: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');

    // Projection: exclude heavy text-blob fields not needed for the list view
    const projection = {
        historialDeportivo: 0,
        historialDeVida: 0,
        objetivos: 0,
        planEntrenamientoHistorial: 0,
        horaExactaEntrenamiento: 0,
    };

    try {
        if (dni) {
            const alumno = await Alumno.findOne({ dni, gimnasioId }, projection).lean();
            return new Response(JSON.stringify(alumno), {
                status: 200,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const gimId = typeof gimnasioId === 'string'
            ? new mongoose.Types.ObjectId(gimnasioId)
            : gimnasioId;

        const [alumnos, planesActivos] = await Promise.all([
            Alumno.find({ gimnasioId }, projection).lean(),
            PlanAlumno.aggregate([
                { $match: { gimnasioId: gimId, activo: true } },
                { $project: { alumnoId: 1, totalSemanas: 1, fechaInicio: 1, nombre: 1, totalDias: { $size: '$dias' } } },
            ]),
        ]);

        // Map alumnoId → active plan (only fields needed for diasRestantes)
        const planMap = new Map<string, any>();
        for (const p of planesActivos) {
            planMap.set(p.alumnoId.toString(), {
                fechaInicio: p.fechaInicio,
                totalSesiones: (p.totalDias ?? 0) * (p.totalSemanas ?? 1),
                nombre: p.nombre,
            });
        }

        const alumnosConPlan = (alumnos as any[]).map(a => ({
            ...a,
            planAlumnoActivo: planMap.get(a._id.toString()) ?? null,
        }));

        return new Response(JSON.stringify(alumnosConPlan), {
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
        });
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
        area,
        nivelExperiencia,
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
            area: area || null,
            nivelExperiencia: nivelExperiencia || null,
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

        notifyOwners(gimnasioId?.toString() ?? '', {
            title: '👤 Nuevo alumno registrado',
            body: `${nombre} ${apellido} se registró en el gimnasio.`,
            url: '/',
        }).catch(() => {});

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
            area,
            nivelExperiencia,
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
                fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
                dni,
                telefono,
                email,
                area: area || null,
                nivelExperiencia: nivelExperiencia || null,
                diasEntrenaSemana: diasEntrenaSemana || null,
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
