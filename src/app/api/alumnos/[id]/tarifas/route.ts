import { NextRequest, NextResponse } from 'next/server';

// API para obtener la tarifa según los días de musculación
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    // Obtener los días de musculación del parámetro de consulta
    const url = new URL(req.url);
    const dias = url.searchParams.get('dias');

    if (!dias || isNaN(Number(dias))) {
        return NextResponse.json({ message: 'Parámetro "dias" inválido' }, { status: 400 });
    }

    // Definir las tarifas según los días de musculación
    const tarifas = {
        1: 1000,
        2: 1800,
        3: 2500,
        4: 3000,
        5: 3500
    };

    // Convertir "dias" a número y obtener la tarifa correspondiente
    const diasNumerico = Number(dias);
    const tarifa = tarifas[diasNumerico as keyof typeof tarifas];

    if (!tarifa) {
        return NextResponse.json({ message: 'Tarifa no encontrada' }, { status: 404 });
    }

    // Devolver la tarifa encontrada
    return NextResponse.json({ tarifa });
}
