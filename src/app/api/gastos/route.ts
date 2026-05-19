import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gasto from '@/models/Gasto';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        await connectMongoDB();
        const gastos = await Gasto.find({ gimnasioId });
        return NextResponse.json(gastos, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al obtener los gastos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        const { fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        const nuevoGasto = new Gasto({ fecha, detalle, importe, gimnasioId });
        await nuevoGasto.save();
        return NextResponse.json({ message: 'Gasto registrado con éxito' }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error al registrar el gasto' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        const { id, fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        await Gasto.findOneAndUpdate({ _id: id, gimnasioId }, { fecha, detalle, importe });
        return NextResponse.json({ message: 'Gasto actualizado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al actualizar el gasto' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        const { id } = await req.json();
        await connectMongoDB();
        await Gasto.findOneAndDelete({ _id: id, gimnasioId });
        return NextResponse.json({ message: 'Gasto eliminado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al eliminar el gasto' }, { status: 500 });
    }
}
