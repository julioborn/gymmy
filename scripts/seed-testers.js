const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const USE_ATLAS = process.env.USE_ATLAS === 'true';
const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

const PASSWORD = 'Gymmy2024';

async function main() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    // Tomar el primer gimnasio disponible
    const gimnasio = await db.collection('gimnasios').findOne({});
    if (!gimnasio) { console.error('No hay gimnasios'); process.exit(1); }

    console.log(`Usando gimnasio: ${gimnasio.nombre} (${gimnasio._id})`);

    const hashed = await bcrypt.hash(PASSWORD, 10);

    for (let i = 1; i <= 12; i++) {
        const dni = String(i).padStart(8, '0');
        const nombre = `Tester`;
        const apellido = String(i).padStart(2, '0');

        const existe = await db.collection('alumnos').findOne({ dni, gimnasioId: gimnasio._id });
        if (existe) {
            console.log(`Tester ${i} ya existe, actualizando contraseña...`);
            await db.collection('alumnos').updateOne({ _id: existe._id }, { $set: { password: hashed } });
            continue;
        }

        await db.collection('alumnos').insertOne({
            nombre,
            apellido,
            dni,
            gimnasioId: gimnasio._id,
            fechaNacimiento: new Date('2000-01-01'),
            asistencia: [],
            pagos: [],
            planEntrenamiento: { fechaInicio: null, duracion: null, diasRestantes: null, terminado: false },
            planEntrenamientoHistorial: [],
            fcmTokens: [],
            password: hashed,
        });
        console.log(`✓ Tester ${i} creado — DNI: ${dni}`);
    }

    console.log('\n✅ 12 cuentas listas');
    console.log('DNIs: 00000001 al 00000012');
    console.log(`Contraseña: ${PASSWORD}`);
    await client.close();
}

main().catch(console.error);
