import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

async function getDb() {
    const USE_ATLAS = process.env.USE_ATLAS === 'true';
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
}

export async function POST(req: Request) {
    const { dni, gimnasioId, password } = await req.json();

    if (!dni || !gimnasioId || !password) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const { client, db } = await getDb();

    try {
        const alumno = await db.collection('alumnos').findOne({
            dni,
            gimnasioId: new ObjectId(gimnasioId),
        });

        if (!alumno) {
            return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
        }

        if (alumno.password) {
            return NextResponse.json({ error: 'Este alumno ya tiene contraseña configurada' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(password, 10);

        await db.collection('alumnos').updateOne(
            { _id: alumno._id },
            { $set: { password: hashed } }
        );

        return NextResponse.json({ ok: true });
    } finally {
        await client.close();
    }
}
