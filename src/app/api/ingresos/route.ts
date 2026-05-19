import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Ingreso from '@/models/Ingreso';
import mongoose from 'mongoose';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        await connectMongoDB();
        const ingresos = await Ingreso.find({ gimnasioId });
        return NextResponse.json(ingresos, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al obtener los ingresos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        const { fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        const nuevoIngreso = new Ingreso({ fecha, detalle, importe, gimnasioId });
        await nuevoIngreso.save();
        return NextResponse.json({ message: 'Ingreso registrado con éxito' }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error al registrar el ingreso' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        const { id, fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        await Ingreso.findOneAndUpdate({ _id: id, gimnasioId }, { fecha, detalle, importe });
        return NextResponse.json({ message: 'Ingreso actualizado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al actualizar el ingreso' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        const { id } = await req.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'ID no válido' }, { status: 400 });
        }

        await connectMongoDB();
        const deletedIngreso = await Ingreso.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            gimnasioId,
        });

        if (!deletedIngreso) {
            return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Ingreso eliminado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al eliminar el ingreso' }, { status: 500 });
    }
}
