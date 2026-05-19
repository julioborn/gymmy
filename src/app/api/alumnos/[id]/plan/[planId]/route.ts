import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireGymAuth } from '@/lib/requireAuth';

export async function DELETE(_: Request, { params }: { params: { id: string; planId: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    const alumnoId = params.id;
    const { planId } = params;

    try {
        const alumno = await Alumno.findOne({ _id: alumnoId, gimnasioId });

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        alumno.planEntrenamientoHistorial = alumno.planEntrenamientoHistorial.filter(
            (plan: any) => plan._id.toString() !== planId
        );

        await alumno.save();

        return new Response(JSON.stringify({ message: 'Plan eliminado correctamente' }), { status: 200 });
    } catch {
        return new Response(JSON.stringify({ error: 'Error al eliminar el plan' }), { status: 500 });
    }
}
