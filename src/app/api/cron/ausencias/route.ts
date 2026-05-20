import { NextResponse } from 'next/server';
import { cronAusenciaProlongada } from '@/lib/crons';

export async function GET(req: Request) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await cronAusenciaProlongada();
    return NextResponse.json({ ok: true });
}
