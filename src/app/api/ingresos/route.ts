import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Ingreso from '@/models/Ingreso';
import mongoose from 'mongoose';
import { requireAuth } from '@/lib/requireAuth';

export async function GET() {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        await connectMongoDB();
        const ingresos = await Ingreso.find();
        return NextResponse.json(ingresos, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al obtener los ingresos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        const nuevoIngreso = new Ingreso({ fecha, detalle, importe });
        await nuevoIngreso.save();
        return NextResponse.json({ message: 'Ingreso registrado con éxito' }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error al registrar el ingreso' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { id, fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        await Ingreso.findByIdAndUpdate(id, { fecha, detalle, importe });
        return NextResponse.json({ message: 'Ingreso actualizado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al actualizar el ingreso' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { id } = await req.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'ID no válido' }, { status: 400 });
        }

        await connectMongoDB();
        const deletedIngreso = await Ingreso.findByIdAndDelete(new mongoose.Types.ObjectId(id));

        if (!deletedIngreso) {
            return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Ingreso eliminado correctamente' }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Error al eliminar el ingreso' }, { status: 500 });
    }
}
