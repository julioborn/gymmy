import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const uri = process.env.ATLAS_URI || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

// 8 sesiones hacia atrás desde lunes 31 ago 2026 a las 17:30 (lun/mié/vie/lun...)
// Formato: [año, mes (0-based), día, hora, minuto]
const SESIONES = [
    [2026, 7, 31, 17, 30],  // lun 31 ago
    [2026, 7, 28, 17, 30],  // vie 28 ago
    [2026, 7, 26, 17, 30],  // mié 26 ago
    [2026, 7, 24, 17, 30],  // lun 24 ago
    [2026, 7, 21, 17, 30],  // vie 21 ago
    [2026, 7, 19, 17, 30],  // mié 19 ago
    [2026, 7, 17, 17, 30],  // lun 17 ago
    [2026, 7, 14, 17, 30],  // vie 14 ago
];

const client = new MongoClient(uri);

try {
    await client.connect();
    const db = client.db(dbName);

    // Buscar SportTime
    const gym = await db.collection('gimnasios').findOne({ nombre: /sport\s*time/i });
    if (!gym) throw new Error('No se encontró SportTime');
    console.log('Gimnasio:', gym.nombre);

    // Buscar Victoria
    const victoria = await db.collection('usuarios').findOne({
        gimnasioId: gym._id,
        nombre: /victoria/i,
    });
    if (!victoria) throw new Error('No se encontró Victoria');
    console.log('Usuario:', victoria.nombre, victoria.apellido);
    console.log('alumnoVinculadoId:', victoria.alumnoVinculadoId);

    if (!victoria.alumnoVinculadoId) throw new Error('Victoria no tiene alumnoVinculadoId');

    const alumnoId = victoria.alumnoVinculadoId;

    // Limpiar asistencias existentes de musculación en ese rango para evitar duplicados
    const desde = new Date(2026, 7, 14);
    const hasta = new Date(2026, 8, 1); // 1 sep exclusive
    const alumno = await db.collection('alumnos').findOne({ _id: alumnoId });
    if (!alumno) throw new Error('No se encontró el alumno vinculado');

    const asistenciasFiltradas = (alumno.asistencia || []).filter(a => {
        const f = new Date(a.fecha);
        return !(a.actividad === 'Musculación' && f >= desde && f < hasta);
    });

    // Construir las 8 nuevas asistencias
    const nuevasAsistencias = SESIONES.map(([y, m, d, h, min]) => ({
        _id: new ObjectId(),
        fecha: new Date(y, m, d, h, min, 0).toISOString(),
        presente: true,
        actividad: 'Musculación',
    }));

    // Guardar
    await db.collection('alumnos').updateOne(
        { _id: alumnoId },
        { $set: { asistencia: [...asistenciasFiltradas, ...nuevasAsistencias] } }
    );

    console.log(`\n✅ ${nuevasAsistencias.length} asistencias insertadas:`);
    nuevasAsistencias.forEach(a => console.log(' -', a.fecha, a.actividad));
} finally {
    await client.close();
}
