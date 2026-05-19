import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireGymAuth } from '@/lib/requireAuth';

interface Pago {
    _id: string;
    mes: string;
    fechaPago: string;
}

export async function DELETE(request: Request, { params }: { params: { id: string; pagoId: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        await connectMongoDB();

        const { id, pagoId } = params;

        const alumno = await Alumno.findOne({ _id: id, gimnasioId });
        if (!alumno) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        alumno.pagos = alumno.pagos.filter((pago: Pago) => pago._id.toString() !== pagoId);

        await alumno.save();

        return NextResponse.json(alumno, { status: 200 });
    } catch {
        return NextResponse.json({ message: 'Error eliminando el pago' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string; pagoId: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    try {
        await connectMongoDB();

        const { id, pagoId } = params;
        const { nuevaFechaPago, tarifa, diasMusculacion } = await request.json();

        if (!nuevaFechaPago || !tarifa || !diasMusculacion) {
            return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const alumno = await Alumno.findOne({ _id: id, gimnasioId });
        if (!alumno) {
            return NextResponse.json({ message: 'Alumno no encontrado' }, { status: 404 });
        }

        const pagoObjectId = new mongoose.Types.ObjectId(pagoId);
        const pago = alumno.pagos.find((pago: any) => pago._id.equals(pagoObjectId));
        if (!pago) {
            return NextResponse.json({ message: 'Pago no encontrado' }, { status: 404 });
        }

        pago.fechaPago = nuevaFechaPago;
        pago.tarifa = tarifa;
        pago.diasMusculacion = diasMusculacion;

        await alumno.save();

        return NextResponse.json(alumno, { status: 200 });
    } catch {
        return NextResponse.json({ message: 'Error actualizando el pago' }, { status: 500 });
    }
}
