/**
 * Script de migración a multi-tenant.
 *
 * Qué hace:
 *   1. Crea el gimnasio principal (si no existe).
 *   2. Actualiza todos los documentos existentes con gimnasioId.
 *   3. Actualiza los usuarios existentes con gimnasioId y role = 'admin'.
 *   4. Crea el usuario superadmin (si no existe).
 *   5. Recrea los índices únicos compuestos.
 *
 * Uso:
 *   node scripts/migrate-multitenant.mjs
 *
 * Variables de entorno requeridas (del .env.local):
 *   ATLAS_URI o MONGODB_URI, MONGODB_DB, USE_ATLAS
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env.local
try {
    const envPath = join(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) {
            process.env[key.trim()] = rest.join('=').trim();
        }
    });
    console.log('Variables de entorno cargadas desde .env.local');
} catch {
    console.log('No se encontró .env.local, usando variables de entorno del sistema');
}

const USE_ATLAS = process.env.USE_ATLAS === 'true';
const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'gymmy';

// ─── CONFIGURACIÓN ────────────────────────────────────────────────
const GIMNASIO_NOMBRE = 'SportTime';

// Usuario superadmin a crear (cambiá la contraseña antes de correr)
const SUPERADMIN_USERNAME = 'superadmin';
const SUPERADMIN_PASSWORD = 'Estudiob123';
// ──────────────────────────────────────────────────────────────────

async function run() {
    if (!uri) {
        console.error('Error: falta ATLAS_URI o MONGODB_URI en las variables de entorno');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    console.log(`Conectado a: ${dbName}`);

    try {
        // ── 1. Crear o encontrar el gimnasio principal ──────────────────
        let gimnasio = await db.collection('gimnasios').findOne({ nombre: GIMNASIO_NOMBRE });

        if (!gimnasio) {
            const result = await db.collection('gimnasios').insertOne({
                nombre: GIMNASIO_NOMBRE,
                activo: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            gimnasio = { _id: result.insertedId };
            console.log(`Gimnasio creado: ${GIMNASIO_NOMBRE} (${result.insertedId})`);
        } else {
            console.log(`Gimnasio existente encontrado: ${gimnasio._id}`);
        }

        const gimnasioId = gimnasio._id;

        // ── 2. Actualizar colecciones con gimnasioId ────────────────────
        const collections = ['alumnos', 'planes', 'ejercicios', 'tarifas', 'recargo', 'gastos', 'ingresos'];

        for (const col of collections) {
            const result = await db.collection(col).updateMany(
                { gimnasioId: { $exists: false } },
                { $set: { gimnasioId } }
            );
            console.log(`${col}: ${result.modifiedCount} documentos actualizados`);
        }

        // ── 3. Actualizar usuarios existentes (non-superadmin) ──────────
        const userUpdateResult = await db.collection('usuarios').updateMany(
            { gimnasioId: { $exists: false }, role: { $ne: 'superadmin' } },
            { $set: { gimnasioId, role: 'admin' } }
        );
        console.log(`usuarios: ${userUpdateResult.modifiedCount} usuarios actualizados a admin`);

        // ── 4. Crear superadmin si no existe ────────────────────────────
        const existing = await db.collection('usuarios').findOne({ username: SUPERADMIN_USERNAME });
        if (!existing) {
            const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
            await db.collection('usuarios').insertOne({
                username: SUPERADMIN_USERNAME,
                password: hashedPassword,
                role: 'superadmin',
                gimnasioId: null,
            });
            console.log(`Superadmin creado: ${SUPERADMIN_USERNAME}`);
            console.log(`⚠️  IMPORTANTE: Cambiá la contraseña del superadmin inmediatamente.`);
        } else {
            console.log(`Superadmin ya existe: ${SUPERADMIN_USERNAME}`);
        }

        // ── 5. Recrear índices compuestos ───────────────────────────────
        // Alumnos: reemplazar índice único en dni por índice compuesto
        try {
            await db.collection('alumnos').dropIndex('dni_1');
            console.log('Índice dni_1 en alumnos eliminado');
        } catch {
            console.log('Índice dni_1 no existía (ok)');
        }
        await db.collection('alumnos').createIndex({ dni: 1, gimnasioId: 1 }, { unique: true });
        console.log('Índice compuesto { dni, gimnasioId } creado en alumnos');

        // Tarifas: reemplazar índice único en dias por índice compuesto
        try {
            await db.collection('tarifas').dropIndex('dias_1');
            console.log('Índice dias_1 en tarifas eliminado');
        } catch {
            console.log('Índice dias_1 no existía (ok)');
        }
        await db.collection('tarifas').createIndex({ dias: 1, gimnasioId: 1 }, { unique: true });
        console.log('Índice compuesto { dias, gimnasioId } creado en tarifas');

        console.log('\n✅ Migración completada exitosamente.');
        console.log(`   Gimnasio ID: ${gimnasioId}`);

    } finally {
        await client.close();
    }
}

run().catch(err => {
    console.error('Error en la migración:', err);
    process.exit(1);
});
