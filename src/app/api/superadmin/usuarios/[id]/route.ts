import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireAuth';
import { MongoClient, ObjectId } from 'mongodb';

async function getDb() {
    const USE_ATLAS = process.env.USE_ATLAS === 'true';
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
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
