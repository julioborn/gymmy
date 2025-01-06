import { NextRequest, NextResponse } from 'next/server';
import Recargo from '@/models/Recargo'; // Ajusta esta importación a tu modelo
import connectMongoDB from '@/lib/mongodb';

// GET: Obtener el recargo actual
export async function GET() {
    await connectMongoDB();

    try {
        const recargo = await Recargo.findOne();
        if (!recargo) {
            return NextResponse.json({ monto: 0 }); // Retorna un monto predeterminado si no existe
        }
        return NextResponse.json(recargo);
    } catch (error) {
        return NextResponse.json({ error: 'Error obteniendo el recargo' }, { status: 500 });
    }
}

// PUT: Actualizar el recargo
export async function PUT(req: NextRequest) {
    await connectMongoDB();

    try {
        const body = await req.json();
        const { monto } = body;

        if (typeof monto !== 'number' || monto <= 0) {
            return NextResponse.json({ error: 'El monto debe ser un número mayor a 0' }, { status: 400 });
        }

        const recargo = await Recargo.findOneAndUpdate({}, { monto }, { new: true, upsert: true });
        return NextResponse.json(recargo);
    } catch (error) {
        return NextResponse.json({ error: 'Error actualizando el recargo' }, { status: 500 });
    }
}
