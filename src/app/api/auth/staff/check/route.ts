import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

async function getDb() {
    const USE_ATLAS = process.env.USE_ATLAS === 'true';
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username')?.trim();

    if (!username) {
        return NextResponse.json({ found: false });
    }

    const { client, db } = await getDb();
    try {
        const user = await db.collection('usuarios').findOne(
            { username },
            { projection: { _id: 1 } }
        );
        return NextResponse.json({ found: !!user });
    } finally {
        await client.close();
    }
}
