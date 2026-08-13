import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
dotenv.populate(process.env, Object.fromEntries(
    envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
));

const client = new MongoClient(process.env.ATLAS_URI);
const GIMNASIO_ID = new ObjectId('6a0bc7b9aeb5691869fbc112');

// s1..s5 = semana1..semana5 content; kg = referencia del profe; combo = grupo combinado ('1','2','3' o '')
const ej = (nombre, notas, s1, s2, s3, s4, s5, kg, combo = '') => ({
    nombre, notas,
    semana1: s1, semana2: s2, semana3: s3, semana4: s4, semana5: s5,
    kg, kgAlumno: '', observacionesAlumno: '', grupoCombo: combo,
});

const plan = {
    nombre: 'Meso 7',
    categoria: 'Fuerza',
    descripcion: 'Plan de 5 semanas · 3 días por semana · 15 sesiones totales',
    totalSemanas: 5,
    fechaInicio: new Date('2026-08-11'),
    entradaCalor: { ejercicios: [] },
    activo: true,
    dias: [
        {
            titulo: 'Día 1',
            descripcion: 'Potencia + Fuerza superior',
            bloqueActivacion: '',
            ejercicios: [
                ej('Arranque de potencia colgado s/ rodillas (clúster 30")', '',
                    '3 / 2.1 (x2)',
                    '3 / 2.2 (x2)',
                    '3 / 2.2.1 (x2)',
                    '3 / 2.2.2 (x2)',
                    '3 / 2de2(x1)',
                    '50'),
                ej('Sentadillas adelante', '',
                    '5 / 3de7',
                    '5 / 3de5',
                    '5 / 3de6',
                    '5 / 3de7',
                    '5 / 2de5',
                    '80-90'),
                ej('Dominadas supinas en rack', '',
                    '3de6',
                    '8.6.6',
                    '8.8.6',
                    '3de8',
                    '2de6',
                    ''),
                ej('Press militar sentado con barra', '',
                    '3de7',
                    '9.7.7',
                    '9.9.7',
                    '3de9',
                    '2de7',
                    '40'),
                ej('Biceps scott con mancuernas', '',
                    '3 (13 - 12 - 10)',
                    '3 (15 - 14 - 13)',
                    '',
                    '',
                    '2de10',
                    '10'),
            ],
        },
        {
            titulo: 'Día 2',
            descripcion: 'Cargada + Fuerza posterior',
            bloqueActivacion: '',
            ejercicios: [
                ej('Cargada de potencia + fuerza con impulso (clúster 30")', '',
                    '3 / 2.1 (x2)',
                    '3 / 2.2 (x2)',
                    '3 / 2.2.1 (x2)',
                    '3 / 2.2.2 (x2)',
                    '3 / 2de2(x1)',
                    '50-60'),
                ej('Peso muerto hexagonal', '',
                    '5 / 3de7',
                    '5 / 3de5',
                    '5 / 3de6',
                    '5 / 3de7',
                    '5 / 2de5',
                    '110'),
                ej('Press plano con barra', '',
                    '6 / 3de8',
                    '6 / 3de6',
                    '6 / 3de7',
                    '6 / 3de8',
                    '6 / 2de6',
                    '50-55'),
                ej('Remo helms con mancuernas', '',
                    '3de12',
                    '3de13',
                    '3de14',
                    '3de15',
                    '2de12',
                    '12.5'),
                ej('Press francés con barra', '',
                    '3 (16 - 14 - 13)',
                    '',
                    '',
                    '',
                    '2de10',
                    '20', '1'),
                ej('Vuelos laterales', '',
                    '3 (14 - 13 - 11)',
                    '',
                    '',
                    '',
                    '2de10',
                    '5', '1'),
            ],
        },
        {
            titulo: 'Día 3',
            descripcion: 'Potencia + Mixto',
            bloqueActivacion: '',
            ejercicios: [
                ej('Vitalizaciones con disco', '',
                    '3de8',
                    '3de8',
                    '3de10',
                    '3de10',
                    '2de8',
                    '10', '1'),
                ej('Saltos al cajón', '',
                    '3de5',
                    '6.5.5',
                    '6.6.5',
                    '3de6',
                    '2de5',
                    '', '1'),
                ej('Sentadilla pistol con mancuernas', '',
                    '3de5',
                    '6.5.5',
                    '6.6.5',
                    '3de6',
                    '2de5',
                    '5', '2'),
                ej('Remo con barra hexagonal', '',
                    '3de7',
                    '9.7.7',
                    '9.9.7',
                    '3de9',
                    '2de7',
                    '65', '2'),
                ej('Buenos días zercher', '',
                    '3de5',
                    '6.5.5',
                    '6.6.5',
                    '3de6',
                    '2de5',
                    '40', '3'),
                ej('Press inclinado unilateral', '',
                    '3de7',
                    '9.7.7',
                    '9.9.7',
                    '3de9',
                    '2de7',
                    '17', '3'),
            ],
        },
    ],
};

try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    const julio = await db.collection('alumnos').findOne({ nombre: 'Julio', apellido: 'Born' });
    if (!julio) { console.error('No se encontró a Julio Born'); process.exit(1); }
    console.log('Alumno:', julio.nombre, julio.apellido, '|', julio._id);

    const deleted = await db.collection('planalumnos').deleteMany({ alumnoId: julio._id });
    if (deleted.deletedCount > 0) console.log(`Plan anterior eliminado (${deleted.deletedCount})`);

    const result = await db.collection('planalumnos').insertOne({
        ...plan,
        gimnasioId: GIMNASIO_ID,
        alumnoId: julio._id,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    console.log('Meso 7 cargado. ID:', result.insertedId.toString());
    console.log('Inicio:', plan.fechaInicio.toLocaleDateString('es-AR'));
    console.log('Total semanas:', plan.totalSemanas, '| Días:', plan.dias.length, '| Sesiones totales:', plan.totalSemanas * plan.dias.length);
    plan.dias.forEach((d, i) => {
        console.log(`\n${d.titulo}:`);
        d.ejercicios.forEach((e, j) => console.log(`  ${j+1}. ${e.nombre}`));
    });
} finally {
    await client.close();
}
