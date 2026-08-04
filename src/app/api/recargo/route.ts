import { NextRequest, NextResponse } from 'next/server';
import Recargo from '@/models/Recargo';
import connectMongoDB from '@/lib/mongodb';
import { requireGymAuth } from '@/lib/requireAuth';

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const recargo = await Recargo.findOne({ gimnasioId });
        if (!recargo) {
            return NextResponse.json({ montoDiez: 0, montoMes: 0 });
        }
        return NextResponse.json(recargo);
    } catch {
        return NextResponse.json({ error: 'Error obteniendo el recargo' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    await connectMongoDB();

    try {
        const body = await req.json();
        const { montoDiez, montoMes } = body;

        if (typeof montoDiez !== 'number' || montoDiez < 0) {
            return NextResponse.json({ error: 'montoDiez debe ser un número mayor o igual a 0' }, { status: 400 });
        }
        if (typeof montoMes !== 'number' || montoMes < 0) {
            return NextResponse.json({ error: 'montoMes debe ser un número mayor o igual a 0' }, { status: 400 });
        }

        const recargo = await Recargo.findOneAndUpdate(
            { gimnasioId },
            { montoDiez, montoMes, gimnasioId },
            { new: true, upsert: true }
        );
        return NextResponse.json(recargo);
    } catch {
        return NextResponse.json({ error: 'Error actualizando el recargo' }, { status: 500 });
    }
}
