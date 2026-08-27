import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
dotenv.populate(process.env, Object.fromEntries(
    env.split('\n').filter(l => l.trim() && !l.startsWith('#'))
       .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
));

const useAtlas = process.env.USE_ATLAS === 'true';
const uri = useAtlas ? process.env.ATLAS_URI : process.env.MONGODB_URI;
console.log('Conectando a:', useAtlas ? 'Atlas (producción)' : 'local');
const client = new MongoClient(uri);

try {
    await client.connect();
    const db = useAtlas ? client.db('gymmy') : client.db();

    // Find Sporttime (alias puede tener case distinto)
    const sporttime = await db.collection('gimnasios').findOne({
        nombre: { $regex: /sporttime/i }
    });
    if (!sporttime) {
        console.log('ERROR: Gimnasio sporttime no encontrado');
        process.exit(1);
    }
    console.log(`Gimnasio encontrado: ${sporttime.nombre} (_id: ${sporttime._id})`);

    // List all students
    const alumnos = await db.collection('alumnos')
        .find({ gimnasioId: sporttime._id })
        .project({ nombre: 1, apellido: 1, dni: 1, email: 1 })
        .toArray();

    console.log(`\nAlumnos encontrados (${alumnos.length}):`);
    alumnos.forEach(a => {
        console.log(`  - ${a.apellido}, ${a.nombre} | DNI: ${a.dni} | Email: ${a.email} | _id: ${a._id}`);
    });

    // Identify Born Julio (dni or name match)
    const julio = alumnos.find(a =>
        (a.apellido?.toLowerCase().includes('born') && a.nombre?.toLowerCase().includes('julio')) ||
        (a.nombre?.toLowerCase().includes('julio') && a.apellido?.toLowerCase().includes('born'))
    );

    if (!julio) {
        console.log('\nERROR: No se encontró Born Julio. Abortando para evitar borrar al dueño.');
        console.log('Revisá los nombres arriba y ajustá el script si es necesario.');
        process.exit(1);
    }

    console.log(`\nKEEP: ${julio.apellido}, ${julio.nombre} (_id: ${julio._id}) → NO se borra`);

    // Delete all except Julio
    const toDelete = alumnos.filter(a => a._id.toString() !== julio._id.toString());
    console.log(`\nA eliminar: ${toDelete.length} alumnos`);
    toDelete.forEach(a => console.log(`  - ${a.apellido}, ${a.nombre}`));

    if (toDelete.length === 0) {
        console.log('\nNada que borrar.');
        process.exit(0);
    }

    const ids = toDelete.map(a => a._id);
    const result = await db.collection('alumnos').deleteMany({ _id: { $in: ids } });
    console.log(`\nEliminados: ${result.deletedCount} alumnos`);
    console.log('Listo.');
} finally {
    await client.close();
}
