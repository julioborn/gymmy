import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const uri = process.env.ATLAS_URI || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

try {
    await client.connect();
    const db = client.db(dbName);

    // Buscar SportTime
    const gym = await db.collection('gimnasios').findOne({ nombre: /sport\s*time/i });
    if (!gym) throw new Error('No se encontró SportTime');
    console.log('Gimnasio:', gym.nombre);

    // Buscar Victoria en usuarios
    const victoria = await db.collection('usuarios').findOne({
        gimnasioId: gym._id,
        nombre: /victoria/i,
    });
    if (!victoria) throw new Error('No se encontró Victoria en usuarios');
    console.log('Usuario:', victoria.nombre, victoria.apellido);

    const alumnoId = victoria.alumnoVinculadoId;
    if (!alumnoId) throw new Error('Victoria no tiene alumnoVinculadoId');

    // Buscar el plan activo de Victoria
    const plan = await db.collection('planalumnos').findOne({ alumnoId, activo: true });
    if (!plan) throw new Error('No se encontró plan activo para Victoria');
    console.log('Plan encontrado:', plan.nombre, '| fechaInicio actual:', plan.fechaInicio);

    // Setear fechaInicio al 14 agosto 2026 (primera sesión)
    const nuevaFecha = new Date('2026-08-14T00:00:00Z');
    await db.collection('planalumnos').updateOne(
        { _id: plan._id },
        { $set: { fechaInicio: nuevaFecha } }
    );

    console.log('\n✅ fechaInicio actualizada a:', nuevaFecha.toISOString());
    console.log('   Ahora las 8 sesiones de Victoria contarán desde esa fecha.');
} finally {
    await client.close();
}
