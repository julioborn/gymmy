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

// Show which db is being used
const useAtlas = process.env.USE_ATLAS === 'true';
console.log('USE_ATLAS:', useAtlas);
console.log('MONGODB_DB:', process.env.MONGODB_DB);

// Connect to Atlas URI if available (the auth DB)
const authUri = useAtlas ? process.env.ATLAS_URI : process.env.MONGODB_URI;
const authClient = new MongoClient(authUri);
await authClient.connect();
const authDb = authClient.db(process.env.MONGODB_DB);
console.log('\n-- AUTH DB --');
const authCollections = await authDb.listCollections().toArray();
console.log('Colecciones auth:', authCollections.map(c => c.name));
const authUsuarios = await authDb.collection('usuarios').find({}).toArray();
authUsuarios.forEach(u => {
    const { password, ...rest } = u;
    console.log('Usuario:', JSON.stringify(rest));
});
await authClient.close();

// Mongoose DB (MONGODB_URI)
if (useAtlas) {
    const mainClient = new MongoClient(process.env.MONGODB_URI);
    await mainClient.connect();
    const mainDb = mainClient.db();
    console.log('\n-- MAIN DB (Mongoose) --');
    const mainCollections = await mainDb.listCollections().toArray();
    console.log('Colecciones:', mainCollections.map(c => c.name));
    const gimnasios = await mainDb.collection('gimnasios').find({}).toArray();
    console.log('Gimnasios:', gimnasios.map(g => ({ _id: g._id, nombre: g.nombre, alias: g.alias })));
    await mainClient.close();
}
