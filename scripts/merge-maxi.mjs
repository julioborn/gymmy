import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
dotenv.populate(process.env, Object.fromEntries(
    env.split('\n').filter(l => l.trim() && !l.startsWith('#'))
       .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
));

const client = new MongoClient(process.env.ATLAS_URI);
await client.connect();
const db = client.db('gymmy');

const maxi = await db.collection('usuarios').findOne({ username: 'maxi' });
const maximiliano = await db.collection('usuarios').findOne({ username: '39499786' });

console.log('maxi:', maxi ? `role=${maxi.role}` : 'no encontrado');
console.log('maximiliano:', maximiliano ? `role=${maximiliano.role}` : 'no encontrado');

if (maxi && maximiliano) {
    // Copiar contraseña real de maxi al registro de Maximiliano
    await db.collection('usuarios').updateOne(
        { username: '39499786' },
        { $set: { password: maxi.password } }
    );
    // Eliminar el viejo registro "maxi"
    await db.collection('usuarios').deleteOne({ username: 'maxi' });
    console.log('✓ Contraseña de "maxi" copiada a Maximiliano Cerdan y registro duplicado eliminado');
} else if (!maxi) {
    console.log('No existe usuario "maxi" — nada que fusionar');
} else {
    console.log('No existe registro de Maximiliano — revisar manualmente');
}

await client.close();
