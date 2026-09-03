import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const uri = process.env.USE_ATLAS === 'true' ? process.env.ATLAS_URI : process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function main() {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    // Buscar alumno "Julio"
    const alumnos = await db.collection('alumnos').find(
        { nombre: { $regex: /julio/i } }
    ).toArray();

    console.log(`\nAlumnos con nombre Julio: ${alumnos.length}`);
    for (const a of alumnos) {
        console.log(`  - ${a.nombre} ${a.apellido} | DNI: ${a.dni} | gimnasioId: ${a.gimnasioId}`);
        if (a.gimnasioId) {
            const gym = await db.collection('gimnasios').findOne({ _id: a.gimnasioId });
            console.log(`    Gym: ${gym?.nombre} | logoHeaderUrl: ${gym?.logoHeaderUrl} | logoUrl: ${gym?.logoUrl}`);
        }
    }

    // Buscar SportTime
    console.log('\nBuscando gimnasio SportTime...');
    const sporttimes = await db.collection('gimnasios').find(
        { nombre: { $regex: /sport/i } }
    ).toArray();

    for (const g of sporttimes) {
        console.log(`  - ${g.nombre} | _id: ${g._id} | logoHeaderUrl: ${g.logoHeaderUrl} | logoUrl: ${g.logoUrl}`);
    }
}

main().catch(console.error).finally(() => client.close());
