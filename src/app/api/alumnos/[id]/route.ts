import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;

    try {
        const alumno = await Alumno.findOne({ _id: id, gimnasioId });
        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error al obtener el alumno', { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const { id } = params;
    const { dia, asistencia } = await request.json();

    try {
        const alumno = await Alumno.findOneAndUpdate(
            { _id: id, gimnasioId },
            { $set: { [`asistencia.${dia}`]: asistencia } },
            { new: true }
        );

        if (!alumno) {
            return new Response('Alumno not found', { status: 404 });
        }

        return new Response(JSON.stringify(alumno), { status: 200 });
    } catch {
        return new Response('Error updating alumno', { status: 500 });
    }
}
