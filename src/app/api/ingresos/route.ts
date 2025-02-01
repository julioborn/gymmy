import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Ingreso from '@/models/Ingreso';
import mongoose from 'mongoose';

export async function GET() {
    try {
        await connectMongoDB();
        const ingresos = await Ingreso.find();
        return NextResponse.json(ingresos, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener los ingresos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        const nuevoingreso = new Ingreso({ fecha, detalle, importe });
        await nuevoingreso.save();
        return NextResponse.json({ message: 'ingreso registrado con éxito' }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Error al registrar el ingreso' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { id, fecha, detalle, importe } = await req.json();
        await connectMongoDB();
        await Ingreso.findByIdAndUpdate(id, { fecha, detalle, importe });
        return NextResponse.json({ message: 'ingreso actualizado correctamente' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar el ingreso' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        console.log("Intentando eliminar ingreso con ID:", id); // 👀 Verificar ID

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'ID no válido' }, { status: 400 });
        }

        await connectMongoDB();
        const deletedIngreso = await Ingreso.findByIdAndDelete(new mongoose.Types.ObjectId(id));

        console.log("Ingreso eliminado:", deletedIngreso); // 👀 Verificar si realmente se eliminó

        if (!deletedIngreso) {
            return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Ingreso eliminado correctamente' }, { status: 200 });
    } catch (error) {
        console.error("Error en la eliminación:", error);
        return NextResponse.json({ error: 'Error al eliminar el ingreso' }, { status: 500 });
    }
}
