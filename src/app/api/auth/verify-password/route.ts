import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/mongoClient';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) return NextResponse.json({ ok: false }, { status: 401 });

    const { password } = await req.json();
    if (!password) return NextResponse.json({ ok: false }, { status: 400 });

    try {
        const { db } = await getDb();
        const user = await db.collection('usuarios').findOne(
            { username: session.user.username },
            { projection: { password: 1 } }
        );
        if (!user) return NextResponse.json({ ok: false }, { status: 401 });
        const valid = await bcrypt.compare(password, user.password);
        return NextResponse.json({ ok: valid });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
