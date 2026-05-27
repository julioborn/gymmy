import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireAuth';
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.error;

    try {
        const { username, role, password } = await req.json();
        if (!username || !role) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const { client, db } = await getDb();
        try {
            const update: Record<string, any> = { username, role };
            if (password) {
                update.password = await bcrypt.hash(password, 10);
            }
            const result = await db.collection('usuarios').updateOne(
                { _id: new ObjectId(params.id) },
                { $set: update }
            );
            if (result.matchedCount === 0) {
                return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
            }
            return NextResponse.json({ ok: true });
        } finally {
            await client.close();
        }
    } catch {
        return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.error;

    try {
        const { client, db } = await getDb();
        try {
            const result = await db.collection('usuarios').deleteOne({ _id: new ObjectId(params.id) });
            if (result.deletedCount === 0) {
                return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
            }
            return NextResponse.json({ message: 'Usuario eliminado' });
        } finally {
            await client.close();
        }
    } catch {
        return NextResponse.json({ error: 'Error al eliminar el usuario' }, { status: 500 });
    }
}
