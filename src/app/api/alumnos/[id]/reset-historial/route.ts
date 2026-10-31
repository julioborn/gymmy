import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireGymAuth } from '@/lib/requireAuth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role } = auth.session.user;

    if (!['dueño', 'admin'].includes(role ?? '')) {
        return new Response(JSON.stringify({ error: 'Sin permiso' }), { status: 403 });
    }

    await connectMongoDB();
    const { id } = params;

    try {
        const alumno = await Alumno.findOneAndUpdate(
            { _id: id, gimnasioId },
            {
                $set: {
                    asistencia: [],
                    pagos: [],
                    planEntrenamientoHistorial: [],
                    planEntrenamiento: { fechaInicio: null, duracion: null, diasRestantes: null, terminado: false },
                },
            },
            { new: true },
        );

        if (!alumno) {
            return new Response(JSON.stringify({ error: 'Alumno no encontrado' }), { status: 404 });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch {
        return new Response(JSON.stringify({ error: 'Error al vaciar el historial' }), { status: 500 });
    }
}
