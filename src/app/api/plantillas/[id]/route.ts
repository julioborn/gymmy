import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import PlantillaEntrenamiento from '@/models/PlantillaEntrenamiento';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const plantilla = await PlantillaEntrenamiento.findOne({
            _id: params.id,
            gimnasioId,
        }).lean();

        if (!plantilla) {
            return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
        }

        return NextResponse.json(plantilla, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al obtener la plantilla' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const body = await request.json();
        const { nombre, categoria, descripcion, entradaCalor, dias } = body;

        if (!nombre || !nombre.trim()) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }
        if (!categoria) {
            return NextResponse.json({ error: 'La categoría es obligatoria' }, { status: 400 });
        }

        const actualizada = await PlantillaEntrenamiento.findOneAndUpdate(
            { _id: params.id, gimnasioId },
            {
                nombre: nombre.trim(),
                categoria,
                descripcion: descripcion || '',
                entradaCalor: entradaCalor || { ejercicios: [] },
                dias: dias || [],
            },
            { new: true }
        );

        if (!actualizada) {
            return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
        }

        return NextResponse.json(actualizada, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al actualizar la plantilla' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const eliminada = await PlantillaEntrenamiento.findOneAndDelete({
            _id: params.id,
            gimnasioId,
        });

        if (!eliminada) {
            return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Plantilla eliminada correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al eliminar la plantilla' }, { status: 500 });
    }
}
