import Asistencia from '@/models/Asistencia';
import connectMongoDB from '../../../lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';

export async function GET() {
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();

    try {
        const asistencias = await Asistencia.find();
        return new Response(JSON.stringify(asistencias), { status: 200 });
    } catch {
        return new Response('Error fetching asistencias', { status: 500 });
    }
}
