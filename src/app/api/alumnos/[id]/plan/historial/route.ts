import { NextRequest } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireGymAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    const { fechaInicio, fechaFin, duracion, asistenciasContadas } = await req.json();
    if (!fechaInicio || !fechaFin) {
        return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
    }

    await connectMongoDB();
    const alumno = await Alumno.findOne({ _id: params.id, gimnasioId });
    if (!alumno) return new Response('Alumno no encontrado', { status: 404 });

    alumno.planEntrenamientoHistorial.push({
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        duracion: duracion ?? 0,
        asistenciasContadas: asistenciasContadas ?? 0,
    });
    await alumno.save();

    return new Response(JSON.stringify({ ok: true }), { status: 201 });
}
