/**
 * Elimina todas las asistencias de "Julio Born" excepto la del lunes 11 de agosto de 2026.
 * Uso: node scripts/limpiar-asistencias-julio.mjs
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
    const envPath = join(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    });
} catch {
    console.log('No se encontró .env.local, usando variables del sistema');
}

const USE_ATLAS = process.env.USE_ATLAS === 'true';
const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'gymmy';

const FECHA_CONSERVAR = new Date('2026-08-11'); // lunes 11 de agosto

async function run() {
    if (!uri) {
        console.error('Falta ATLAS_URI o MONGODB_URI en .env.local');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const alumnos = db.collection('alumnos');

    // Buscar al alumno
    const alumno = await alumnos.findOne({
        nombre: { $regex: /^julio$/i },
        apellido: { $regex: /^born$/i },
    });

    if (!alumno) {
        console.error('No se encontró al alumno Julio Born');
        await client.close();
        process.exit(1);
    }

    console.log(`Alumno encontrado: ${alumno.nombre} ${alumno.apellido} (${alumno._id})`);
    console.log(`Total asistencias actuales: ${alumno.asistencia?.length ?? 0}`);

    // Separar las asistencias a conservar y las que se borran
    const conservar = [];
    const borrar = [];

    for (const a of alumno.asistencia ?? []) {
        const fecha = new Date(a.fecha);
        const mismodia =
            fecha.getFullYear() === FECHA_CONSERVAR.getFullYear() &&
            fecha.getMonth() === FECHA_CONSERVAR.getMonth() &&
            fecha.getDate() === FECHA_CONSERVAR.getDate();

        if (mismodia) {
            conservar.push(a);
        } else {
            borrar.push(a);
        }
    }

    console.log(`\nAsistencias a CONSERVAR (${conservar.length}):`);
    conservar.forEach(a => console.log(`  ✓ ${new Date(a.fecha).toLocaleString('es-AR')} — ${a.actividad}`));

    console.log(`\nAsistencias a ELIMINAR (${borrar.length}):`);
    borrar.slice(0, 10).forEach(a => console.log(`  ✗ ${new Date(a.fecha).toLocaleString('es-AR')} — ${a.actividad}`));
    if (borrar.length > 10) console.log(`  ... y ${borrar.length - 10} más`);

    if (borrar.length === 0) {
        console.log('\nNada que eliminar.');
        await client.close();
        return;
    }

    // Confirmar en consola
    console.log('\n⚠️  Se van a eliminar estas asistencias. Corré el script con --confirmar para aplicarlo.');

    if (!process.argv.includes('--confirmar')) {
        await client.close();
        return;
    }

    // Aplicar: reemplazar asistencia[] con solo las de conservar
    await alumnos.updateOne(
        { _id: alumno._id },
        { $set: { asistencia: conservar } }
    );

    console.log(`\n✅ Listo. Se eliminaron ${borrar.length} asistencias. Quedan ${conservar.length}.`);
    await client.close();
}

run().catch(err => { console.error(err); process.exit(1); });
