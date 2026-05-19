import Alumno from '@/models/Alumno';
import connectMongoDB from '../../../lib/mongodb';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const alumnos = await Alumno.find({ gimnasioId });
        return new Response(JSON.stringify(alumnos), { status: 200 });
    } catch {
        return new Response('Error fetching asistencias', { status: 500 });
    }
}
