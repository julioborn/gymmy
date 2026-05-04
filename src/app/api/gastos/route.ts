import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gasto from '@/models/Gasto';
import { requireAuth } from '@/lib/requireAuth';

export async function GET() {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        await connectMongoDB();
        const gastos = await Gasto.find();
        return NextResponse.json(gastos, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al obtener los gastos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        const nuevoGasto = new Gasto({ fecha, detalle, importe });
        await nuevoGasto.save();
        return NextResponse.json({ message: 'Gasto registrado con éxito' }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error al registrar el gasto' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { id, fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        await Gasto.findByIdAndUpdate(id, { fecha, detalle, importe });
        return NextResponse.json({ message: 'Gasto actualizado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al actualizar el gasto' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { id } = await req.json();
        await connectMongoDB();
        await Gasto.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Gasto eliminado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al eliminar el gasto' }, { status: 500 });
    }
}
