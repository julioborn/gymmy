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

const plan = await db.collection('planalumnos').findOne({ alumnoId: victoria.alumnoVinculadoId, activo: true });
console.log('Plan:', plan.nombre, '| totalSemanas actual:', plan.totalSemanas, '| días/semana:', plan.dias.length);

const res = await db.collection('planalumnos').updateOne(
    { _id: plan._id },
    { $set: { totalSemanas: 6 } }
);
console.log('Actualizado:', res.modifiedCount, '→ totalSemanas = 6 (6 semanas × 3 días = 18 sesiones)');
await client.close();
