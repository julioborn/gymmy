import { NextRequest, NextResponse } from 'next/server';
import Recargo from '@/models/Recargo';
import connectMongoDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';

export async function GET() {
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();

    try {
        const recargo = await Recargo.findOne();
        if (!recargo) {
            return NextResponse.json({ monto: 0 });
        }
        return NextResponse.json(recargo);
    } catch {
        return NextResponse.json({ error: 'Error obteniendo el recargo' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();

    try {
        const body = await req.json();
        const { monto } = body;

        if (typeof monto !== 'number' || monto <= 0) {
            return NextResponse.json({ error: 'El monto debe ser un número mayor a 0' }, { status: 400 });
        }

        const recargo = await Recargo.findOneAndUpdate({}, { monto }, { new: true, upsert: true });
        return NextResponse.json(recargo);
    } catch {
        return NextResponse.json({ error: 'Error actualizando el recargo' }, { status: 500 });
    }
}
