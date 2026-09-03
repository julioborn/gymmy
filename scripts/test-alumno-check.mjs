import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const uri = process.env.USE_ATLAS === 'true' ? process.env.ATLAS_URI : process.env.MONGODB_URI;

const GimnasioSchema = new mongoose.Schema({
    nombre: String,
    activo: Boolean,
    logoUrl: String,
    logoHeaderUrl: String,
}, { collection: 'gimnasios' });

const AlumnoSchema = new mongoose.Schema({
    nombre: String,
    apellido: String,
    dni: String,
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio' },
    password: { type: String, select: false },
}, { collection: 'alumnos' });

const Gimnasio = mongoose.models.Gimnasio || mongoose.model('Gimnasio', GimnasioSchema);
const Alumno = mongoose.models.Alumno || mongoose.model('Alumno', AlumnoSchema);

// DNI de Julio Born
const dni = '43844409';

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB });
console.log('Connected');

const [alumnos, alumnosConPwd] = await Promise.all([
    Alumno.find({ dni }).populate('gimnasioId', 'nombre activo logoUrl logoHeaderUrl'),
    Alumno.find({ dni }).select('+password').lean(),
]);

console.log(`\nAlumnos found: ${alumnos.length}`);
for (const a of alumnos) {
    console.log('Alumno:', a.nombre, a.apellido);
    console.log('gimnasioId populated:', JSON.stringify(a.gimnasioId, null, 2));
    const gym = a.gimnasioId;
    console.log('logoHeaderUrl:', gym?.logoHeaderUrl);
    console.log('logoUrl:', gym?.logoUrl);
    console.log('Result gimnasioLogoUrl:', gym?.logoHeaderUrl || gym?.logoUrl || null);
}

await mongoose.disconnect();
