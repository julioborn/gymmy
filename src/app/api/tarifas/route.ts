import connectMongoDB from '@/lib/mongodb';
import Recargo from '@/models/Recargo';
import Tarifa from '@/models/Tarifa';
import { NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();
    try {
        const tarifas = await Tarifa.find({ gimnasioId }).sort({ dias: 1 });
        const recargoDoc = await Recargo.findOne({ gimnasioId });

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
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();
    const nuevasTarifas = await request.json();

    try {
        const promises = nuevasTarifas.map((tarifa: { dias: number; valor: number }) =>
            Tarifa.findOneAndUpdate(
                { dias: tarifa.dias, gimnasioId },
                { valor: tarifa.valor, gimnasioId },
                { new: true, upsert: true }
            )
        );
        await Promise.all(promises);
        return NextResponse.json({ message: 'Tarifas actualizadas' }, { status: 200 });
    } catch {
        return NextResponse.json({ message: 'Error al actualizar tarifas' }, { status: 500 });
    }
}
