import connectMongoDB from '@/lib/mongodb';
import Tarifa from '@/models/Tarifa';
import { NextResponse } from 'next/server';

export async function GET() {
    await connectMongoDB();
    try {
        const tarifas = await Tarifa.find();
        return NextResponse.json(tarifas, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error al obtener tarifas' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    await connectMongoDB();
    const nuevasTarifas = await request.json();

    try {
        const promises = nuevasTarifas.map((tarifa: { dias: number; valor: number }) =>
            Tarifa.findOneAndUpdate(
                { dias: tarifa.dias },
                { valor: tarifa.valor },
                { new: true, upsert: true }
            )
        );
        await Promise.all(promises);
        return NextResponse.json({ message: 'Tarifas actualizadas' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error al actualizar tarifas' }, { status: 500 });
    }
}