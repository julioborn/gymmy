import Asistencia from '@/models/Asistencia';
import connectMongoDB from '../../../lib/mongodb';

// GET asistencias
export async function GET() {
    await connectMongoDB();

    try {
        const asistencias = await Asistencia.find(); // Suponiendo que tienes un modelo Asistencia
        return new Response(JSON.stringify(asistencias), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response('Error fetching asistencias', { status: 500 });
    }
}
