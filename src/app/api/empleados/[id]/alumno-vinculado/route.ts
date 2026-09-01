import { NextRequest, NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import { MongoClient, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

async function getDb() {
    const uri = process.env.USE_ATLAS === 'true' ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, id: myId } = auth.session.user;

    if (params.id !== myId) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
    if (!gimnasioId) return NextResponse.json({ error: 'Sin gimnasio' }, { status: 400 });

    const { client, db } = await getDb();
    try {
        const emp = await db.collection('usuarios').findOne(
            { _id: new ObjectId(params.id), gimnasioId: new ObjectId(gimnasioId) },
            { projection: { alumnoVinculadoId: 1 } }
        );
        if (!emp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        return NextResponse.json({ alumnoId: emp.alumnoVinculadoId ? String(emp.alumnoVinculadoId) : null });
    } finally {
        await client.close();
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, id: myId } = auth.session.user;

    if (params.id !== myId) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
    if (!gimnasioId) return NextResponse.json({ error: 'Sin gimnasio' }, { status: 400 });

    const { client, db } = await getDb();
    try {
        const emp = await db.collection('usuarios').findOne(
            { _id: new ObjectId(params.id) },
            { projection: { alumnoVinculadoId: 1, nombre: 1, apellido: 1, dni: 1 } }
        );
        if (!emp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        if (emp.alumnoVinculadoId) {
            return NextResponse.json({ alumnoId: String(emp.alumnoVinculadoId) });
        }

        const now = new Date();
        const alumnoDoc = {
            nombre: emp.nombre || 'Profesor',
            apellido: emp.apellido || '',
            fechaNacimiento: new Date('1990-01-01'),
            dni: emp.dni || '00000000',
            asistencia: [],
            pagos: [],
            planEntrenamiento: { fechaInicio: null, duracion: null, diasRestantes: null, terminado: false },
            planEntrenamientoHistorial: [],
            gimnasioId: new ObjectId(gimnasioId),
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection('alumnos').insertOne(alumnoDoc);
        const alumnoId = result.insertedId;

        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(params.id) },
            { $set: { alumnoVinculadoId: alumnoId } }
        );

        return NextResponse.json({ alumnoId: String(alumnoId) });
    } finally {
        await client.close();
    }
}
