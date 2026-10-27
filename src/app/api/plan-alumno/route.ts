import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import PlanAlumno from '@/models/PlanAlumno';
import Alumno from '@/models/Alumno';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();
    const planes = await PlanAlumno.find({ gimnasioId }).sort({ createdAt: -1 });
    return NextResponse.json(planes);
}

export async function POST(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    const body = await req.json();
    const { alumnoId, plantillaId, nombre, categoria, descripcion, entradaCalor, dias, totalSemanas, fechaInicio } = body;

    if (!alumnoId || !nombre) {
        return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Normalize fechaInicio to midnight UTC of the given date so same-day sessions are always included
    const normalizarFecha = (f?: string) => {
        if (!f) return new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
        return new Date(f.slice(0, 10) + 'T00:00:00Z');
    };

    await connectMongoDB();

    // Deactivate all previous active PlanAlumno for this alumno
    await PlanAlumno.updateMany({ alumnoId, activo: true }, { $set: { activo: false } });

    // Archive embedded planEntrenamiento (simple tracking plan) to historial so the calendar shows it as completed
    const alumnoDoc = await Alumno.findById(alumnoId);
    if (alumnoDoc?.planEntrenamiento?.fechaInicio && !alumnoDoc.planEntrenamiento.terminado) {
        const oldStart = new Date(alumnoDoc.planEntrenamiento.fechaInicio);
        const newStart = normalizarFecha(fechaInicio);
        const fechaFin = new Date(newStart.getTime() - 24 * 60 * 60 * 1000);
        const asistenciasContadas = (alumnoDoc.asistencia || []).filter(
            (a: any) => a.actividad === 'Musculación' && a.presente &&
                new Date(a.fecha) >= oldStart && new Date(a.fecha) <= fechaFin
        ).length;
        alumnoDoc.planEntrenamientoHistorial.push({
            fechaInicio: oldStart,
            fechaFin,
            duracion: alumnoDoc.planEntrenamiento.duracion || 0,
            asistenciasContadas,
        });
        alumnoDoc.planEntrenamiento = undefined;
        await alumnoDoc.save();
    }

    const plan = await PlanAlumno.create({
        gimnasioId,
        alumnoId,
        plantillaId: plantillaId || undefined,
        nombre,
        categoria: categoria || '',
        descripcion: descripcion || '',
        entradaCalor: entradaCalor || { ejercicios: [] },
        dias: dias || [],
        totalSemanas: totalSemanas || 4,
        fechaInicio: normalizarFecha(fechaInicio),
    });

    return NextResponse.json(plan, { status: 201 });
}
