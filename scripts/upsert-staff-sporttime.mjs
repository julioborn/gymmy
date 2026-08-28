import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
dotenv.populate(process.env, Object.fromEntries(
    env.split('\n').filter(l => l.trim() && !l.startsWith('#'))
       .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
));

const client = new MongoClient(process.env.ATLAS_URI);
await client.connect();
const db = client.db('gymmy');

// Buscar SportTime
const gym = await db.collection('gimnasios').findOne({ nombre: /sporttime/i });
if (!gym) { console.error('No se encontró el gimnasio SportTime'); process.exit(1); }
console.log(`Gimnasio: ${gym.nombre} (${gym._id})`);

const staff = [
    {
        nombre: 'Bruno',
        apellido: 'Martinenghi',
        dni: '37210203',
        fechaNacimiento: new Date('1994-01-22'),
        role: 'dueño',
        // Ya existe con username 37210203 — solo actualizar datos personales
    },
    {
        nombre: 'Canela',
        apellido: 'Zordan',
        dni: '44810912',
        fechaNacimiento: new Date('2003-05-21'),
        role: 'profesor',
    },
    {
        nombre: 'Maximiliano',
        apellido: 'Cerdan',
        dni: '39499786',
        fechaNacimiento: new Date('1996-04-13'),
        role: 'profesor',
    },
    {
        nombre: 'Victoria',
        apellido: 'Cardonati',
        dni: '43715735',
        fechaNacimiento: new Date('2001-12-27'),
        role: 'profesor',
    },
];

for (const person of staff) {
    const username = person.dni;

    // Buscar por username (DNI) primero
    let existing = await db.collection('usuarios').findOne({ username });

    // Si no existe por DNI, buscar por nombre dentro del gimnasio
    if (!existing) {
        existing = await db.collection('usuarios').findOne({
            gimnasioId: gym._id,
            $or: [
                { nombre: new RegExp(`^${person.nombre}$`, 'i') },
                { username: new RegExp(person.nombre, 'i') },
            ],
        });
    }

    if (existing) {
        // Actualizar registro existente
        const update = {
            nombre: person.nombre,
            apellido: person.apellido,
            dni: person.dni,
            fechaNacimiento: person.fechaNacimiento,
            role: person.role,
            gimnasioId: gym._id,
            username, // actualizar username al DNI
        };
        await db.collection('usuarios').updateOne({ _id: existing._id }, { $set: update });
        console.log(`✓ Actualizado: ${person.nombre} ${person.apellido} (DNI: ${person.dni}) — antes username: "${existing.username}"`);
    } else {
        // Insertar nuevo
        const tempPassword = await bcrypt.hash(person.dni, 10); // contraseña temporal = DNI
        await db.collection('usuarios').insertOne({
            username,
            password: tempPassword,
            nombre: person.nombre,
            apellido: person.apellido,
            dni: person.dni,
            fechaNacimiento: person.fechaNacimiento,
            role: person.role,
            gimnasioId: gym._id,
        });
        console.log(`✓ Creado nuevo: ${person.nombre} ${person.apellido} (DNI: ${person.dni}) — contraseña temp: ${person.dni}`);
    }
}

console.log('\nListo. Verificando...');
const resultado = await db.collection('usuarios')
    .find({ gimnasioId: gym._id })
    .project({ password: 0 })
    .toArray();

for (const u of resultado) {
    console.log(`  - ${u.nombre ?? ''} ${u.apellido ?? ''} | username: ${u.username} | role: ${u.role} | dni: ${u.dni ?? 'N/A'}`);
}

await client.close();
