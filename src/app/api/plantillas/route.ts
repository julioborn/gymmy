import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import PlantillaEntrenamiento from '@/models/PlantillaEntrenamiento';
import { requireGymAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const plantillas = await PlantillaEntrenamiento.find({ gimnasioId })
            .sort({ categoria: 1, nombre: 1 })
            .lean();
        return NextResponse.json(plantillas, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 });
    }
}

export async function POST(request: Request) {
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

        const nueva = new PlantillaEntrenamiento({
            gimnasioId,
            nombre: nombre.trim(),
            categoria,
            descripcion: descripcion || '',
            entradaCalor: entradaCalor || { ejercicios: [] },
            dias: dias || [],
        });

        await nueva.save();
        return NextResponse.json(nueva, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error al crear la plantilla' }, { status: 500 });
    }
}
