import connectMongoDB from '@/lib/mongodb';
import Recargo from '@/models/Recargo';
import Tarifa from '@/models/Tarifa';
import { NextResponse } from 'next/server';

export async function GET() {
    await connectMongoDB();
    try {
        const tarifas = await Tarifa.find().sort({ dias: 1 });

        // ⬇️ Si no tenés modelo Recargo, podés usar un valor fijo
        const recargoDoc = await Recargo.findOne(); // O podés hacer: const recargo = 0;

        return NextResponse.json({
            ok: true,
            tarifas,
            recargo: recargoDoc?.monto || 0, // O simplemente recargo: 0 si no usás modelo
        }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ ok: false, message: 'Error al obtener tarifas' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic'; // ⬅️ importante
export async function PUT(request: Request) {
    console.log("➡️ PUT ejecutado");
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