import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb+srv://julioborn:Estudiob123@gymmycluster.ooyeh.mongodb.net/gymmy?retryWrites=true&w=majority');
await client.connect();
const db = client.db('gymmy');

const plan = await db.collection('planalumnos').findOne({ nombre: /Victoria/ });
if (!plan) { console.log('Plan no encontrado'); await client.close(); process.exit(1); }

await db.collection('planalumnos').updateOne(
    { _id: plan._id },
    { $set: {
        'dias.1.ejercicios.0.semana1': "x4 rep 10'",
        'dias.1.ejercicios.0.semana2': "x4/x3 5'/5'",
        'dias.1.ejercicios.0.semana3': "x3 10'",
        'dias.1.ejercicios.0.semana4': "x4 10'",
    }}
);

console.log('✅ Corregido: ° → \' (segundos)');
await client.close();
