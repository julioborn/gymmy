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

const result = await db.collection('gimnasios').updateOne(
    { nombre: /sporttime/i },
    { $set: { logoUrl: 'https://res.cloudinary.com/dwz4lcvya/image/upload/v1734542283/sporttime_mbgshh.jpg' } }
);
console.log('Modified:', result.modifiedCount);
const gym = await db.collection('gimnasios').findOne({ nombre: /sporttime/i });
console.log('logoUrl:', gym?.logoUrl);
await client.close();
