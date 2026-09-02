import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

let client: MongoClient | null = null;
async function getDb() {
    const USE_ATLAS = process.env.USE_ATLAS === 'true';
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI');
    if (!client) { client = new MongoClient(uri); await client.connect(); }
    return client.db(process.env.MONGODB_DB);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) return NextResponse.json({ ok: false }, { status: 401 });

    const { password } = await req.json();
    if (!password) return NextResponse.json({ ok: false }, { status: 400 });

    try {
        const db = await getDb();
        const user = await db.collection('usuarios').findOne({ username: session.user.username });
        if (!user) return NextResponse.json({ ok: false }, { status: 401 });
        const valid = await bcrypt.compare(password, user.password);
        return NextResponse.json({ ok: valid });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
