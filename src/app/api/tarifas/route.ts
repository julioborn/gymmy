import connectMongoDB from '@/lib/mongodb';
import Recargo from '@/models/Recargo';
import Tarifa from '@/models/Tarifa';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();
    try {
        const tarifas = await Tarifa.find().sort({ dias: 1 });
        const recargoDoc = await Recargo.findOne();

        return NextResponse.json({
            ok: true,
            tarifas,
            recargo: recargoDoc?.monto || 0,
        }, { status: 200 });
    } catch {
        return NextResponse.json({ ok: false, message: 'Error al obtener tarifas' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const authError = await requireAuth();
    if (authError) return authError;

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
    } catch {
        return NextResponse.json({ message: 'Error al actualizar tarifas' }, { status: 500 });
    }
}
