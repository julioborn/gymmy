import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const client = new MongoClient(process.env.ATLAS_URI || process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

const gym = await db.collection('gimnasios').findOne({ nombre: /sport\s*time/i });
const victoria = await db.collection('usuarios').findOne({ gimnasioId: gym._id, nombre: /victoria/i });

const res = await db.collection('planalumnos').updateOne(
    { alumnoId: victoria.alumnoVinculadoId, activo: true },
    { $set: { fechaInicio: new Date('2026-08-11T00:00:00Z') } }
);

console.log('Actualizado:', res.modifiedCount, 'documento(s)');
console.log('fechaInicio → 2026-08-11 (martes 11 de agosto)');
await client.close();
