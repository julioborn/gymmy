import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const ATLAS_URI = 'mongodb+srv://julioborn:Estudiob123@gymmycluster.ooyeh.mongodb.net/gymmy?retryWrites=true&w=majority';
const DB_NAME = 'gymmy';

const client = new MongoClient(ATLAS_URI);

async function seed() {
    await client.connect();
    const db = client.db(DB_NAME);

    // 1. Crear gimnasio de prueba
    const gimnasios = db.collection('gimnasios');
    let gimnasio = await gimnasios.findOne({ nombre: 'Gymmy Demo' });
    if (!gimnasio) {
        const res = await gimnasios.insertOne({
            nombre: 'Gymmy Demo',
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        gimnasio = { _id: res.insertedId, nombre: 'Gymmy Demo' };
        console.log('Gimnasio creado:', gimnasio._id.toString());
    } else {
        console.log('Gimnasio ya existe:', gimnasio._id.toString());
    }

    const gimnasioId = gimnasio._id;

    // 2. Crear usuario staff (dueño)
    const usuarios = db.collection('usuarios');
    const existingStaff = await usuarios.findOne({ username: 'test-owner' });
    if (!existingStaff) {
        const hashed = await bcrypt.hash('owner123', 10);
        await usuarios.insertOne({
            username: 'test-owner',
            password: hashed,
            role: 'dueño',
            gimnasioId: gimnasioId,
        });
        console.log('Usuario staff creado: test-owner / owner123');
    } else {
        console.log('Usuario staff ya existe');
    }

    // 3. Crear alumno de prueba
    const alumnos = db.collection('alumnos');
    const existingAlumno = await alumnos.findOne({ dni: '99999999', gimnasioId: gimnasioId });
    if (!existingAlumno) {
        const hashed = await bcrypt.hash('client123', 10);
        await alumnos.insertOne({
            nombre: 'Test',
            apellido: 'Client',
            dni: '99999999',
            password: hashed,
            gimnasioId: gimnasioId,
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log('Alumno creado: DNI 99999999 / client123');
    } else {
        console.log('Alumno ya existe');
    }

    await client.close();
    console.log('Listo.');
}

seed().catch(console.error);
