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

// SportTime theme: black bg, orange + green accents
// logoHeaderUrl: same PNG (has transparency or will be updated later)
const r = await db.collection('gimnasios').updateOne(
    { nombre: /sporttime/i },
    {
        $set: {
            temaFondo: '#0a0a0a',
            temaAcento: '#f4a347',
            temaAcento2: '#16a34a',
            logoHeaderUrl: 'https://res.cloudinary.com/dwz4lcvya/image/upload/v1787862453/DD63C2C7-F086-4C9E-9AB7-BF21F9C51685_h8oera.png',
        }
    }
);

console.log('Modified:', r.modifiedCount);
const gym = await db.collection('gimnasios').findOne({ nombre: /sporttime/i });
console.log('Tema:', { fondo: gym.temaFondo, acento: gym.temaAcento, acento2: gym.temaAcento2 });
console.log('logoHeaderUrl:', gym.logoHeaderUrl);
await client.close();
