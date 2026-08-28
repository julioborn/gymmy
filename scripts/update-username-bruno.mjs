import { MongoClient } from 'mongodb';
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

const client = new MongoClient(process.env.ATLAS_URI);
await client.connect();
const db = client.db('gymmy');

const before = await db.collection('usuarios').findOne({ username: 'bruno' });
console.log('Antes:', before ? `username="${before.username}", role="${before.role}"` : 'NO ENCONTRADO');

if (before) {
    const r = await db.collection('usuarios').updateOne(
        { username: 'bruno' },
        { $set: { username: '37210203' } }
    );
    console.log('Modificado:', r.modifiedCount);
    const after = await db.collection('usuarios').findOne({ username: '37210203' });
    console.log('Después:', after ? `username="${after.username}", role="${after.role}"` : 'ERROR');
}

await client.close();
