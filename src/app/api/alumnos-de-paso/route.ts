import { NextRequest, NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import connectMongoDB from '@/lib/mongodb';
import AlumnoDePaso from '@/models/AlumnoDePaso';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId } = auth.session.user;

    const { searchParams } = new URL(req.url);
    const soloHoy = searchParams.get('hoy') === '1';
    const q = searchParams.get('q')?.trim();

    await connectMongoDB();

    const query: Record<string, unknown> = { gimnasioId: new ObjectId(gimnasioId!) };

    if (soloHoy) {
        const ahora = new Date();
        const argOffset = -3 * 60 * 60 * 1000;
        const hoyArg = new Date(ahora.getTime() + argOffset);
        const inicioHoy = new Date(Date.UTC(hoyArg.getUTCFullYear(), hoyArg.getUTCMonth(), hoyArg.getUTCDate()));
        const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000);
        query.fecha = { $gte: inicioHoy, $lt: finHoy };
    }

    if (q) {
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            { nombre: { $regex: safe, $options: 'i' } },
            { apellido: { $regex: safe, $options: 'i' } },
        ];
    }

    let find = AlumnoDePaso.find(query).sort({ fecha: -1 });
    if (q) find = find.limit(20);
    const registros = await find.lean();
    return NextResponse.json({ ok: true, registros });
}

export async function POST(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role } = auth.session.user;

    if (!['dueño', 'admin', 'recepcion'].includes(role ?? '')) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectMongoDB();

    const { nombre, apellido, actividad, monto, metodoPago } = await req.json();

    if (!nombre?.trim() || !apellido?.trim()) {
        return NextResponse.json({ error: 'Nombre y apellido son requeridos' }, { status: 400 });
    }

    const registro = await AlumnoDePaso.create({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        actividad: actividad || 'Musculación',
        monto: Number(monto) || 0,
        metodoPago: metodoPago || 'efectivo',
        fecha: new Date(),
        gimnasioId: new ObjectId(gimnasioId!),
    });

    return NextResponse.json({ ok: true, registro }, { status: 201 });
}
