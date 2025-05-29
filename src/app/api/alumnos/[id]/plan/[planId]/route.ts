import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

export async function DELETE(_: Request, { params }: { params: { id: string; planId: string } }) {
    await connectMongoDB();

    const alumnoId = params.id;
    const { planId } = params;

    try {
        const alumno = await Alumno.findById(alumnoId);

        if (!alumno) {
            return new Response('Alumno no encontrado', { status: 404 });
        }

        alumno.planEntrenamientoHistorial = alumno.planEntrenamientoHistorial.filter(
            (plan: any) => plan._id.toString() !== planId
        );

        await alumno.save();

        return new Response(JSON.stringify({ message: 'Plan eliminado correctamente' }), { status: 200 });
    } catch (error) {
        console.error('Error al eliminar el plan:', error);
        return new Response(JSON.stringify({ error: 'Error al eliminar el plan' }), { status: 500 });
    }
}
