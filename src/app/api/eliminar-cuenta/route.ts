import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    const { tipo, valor } = await req.json();

    if (!tipo || !valor) {
        return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    await connectMongoDB();
    const db = mongoose.connection.db!;

    if (tipo === 'alumno') {
        const dni = String(valor).replace(/\./g, '').trim();
        const result = await db.collection('alumnos').deleteOne({ dni });
        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'No encontramos un alumno con ese DNI.' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Cuenta eliminada correctamente. Tus datos han sido borrados.' });
    }

    if (tipo === 'staff') {
        const raw = String(valor).trim().toLowerCase();
        const result = await db.collection('usuarios').deleteOne({
            $or: [{ email: raw }, { username: raw }],
        });
        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'No encontramos una cuenta con ese email o usuario.' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Cuenta eliminada correctamente. Tus datos han sido borrados.' });
    }

    return NextResponse.json({ error: 'Tipo de cuenta inválido.' }, { status: 400 });
}
