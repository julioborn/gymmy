import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb+srv://julioborn:Estudiob123@gymmycluster.ooyeh.mongodb.net/gymmy?retryWrites=true&w=majority');
await client.connect();
const db = client.db('gymmy');

const v = await db.collection('usuarios').findOne({ nombre: /victoria/i });
await db.collection('alumnos').updateOne(
    { _id: v.alumnoVinculadoId },
    { $set: { fechaNacimiento: v.fechaNacimiento, dni: v.dni } }
);

console.log(`✅ Alumno de Victoria actualizado: fechaNacimiento=${v.fechaNacimiento.toISOString().slice(0,10)}, dni=${v.dni}`);
await client.close();
