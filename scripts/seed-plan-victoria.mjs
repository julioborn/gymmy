// Script para crear el plan de entrenamiento de Victoria Cardonati Viturra
import { MongoClient, ObjectId } from 'mongodb';

const ATLAS_URI = 'mongodb+srv://julioborn:Estudiob123@gymmycluster.ooyeh.mongodb.net/gymmy?retryWrites=true&w=majority';
const DB_NAME = 'gymmy';

const ej = (nombre, notas, s1, s2, s3, s4, kg = '') => ({
    nombre,
    notas,
    semana1: s1,
    semana2: s2,
    semana3: s3,
    semana4: s4,
    semana5: '',
    kg,
    kgAlumno1: '', kgAlumno2: '', kgAlumno3: '', kgAlumno4: '', kgAlumno5: '',
    observacionesAlumno1: '', observacionesAlumno2: '', observacionesAlumno3: '',
    observacionesAlumno4: '', observacionesAlumno5: '',
    grupoCombo: '',
});

const planDoc = {
    nombre: 'Plan Victoria — Ago 2026',
    categoria: 'Musculación',
    descripcion: '',
    totalSemanas: 4,
    fechaInicio: new Date(),
    activo: true,
    entradaCalor: {
        ejercicios: [
            { nombre: 'Movilidad tobillo', notas: '' },
            { nombre: 'Movilidad cadera', notas: '' },
            { nombre: 'Movilidad dorsal', notas: '' },
            { nombre: 'Movilidad hombros: c/banda / bastón', notas: '' },
            { nombre: 'Variante de plancha lateral + activador', notas: '' },
        ],
    },
    dias: [
        {
            titulo: 'Día 1 — Tren inferior / superior',
            descripcion: '',
            bloqueActivacion: 'Tirones / cargada estricta / emp fza',
            ejercicios: [
                ej(
                    'Cargada parado x1 (desde el suelo) + 2do tiempo en tijera x1',
                    '',
                    '3/3/2x3/2x2',
                    '3/3/2x3/2x3',
                    '3/3/3/3x2',
                    '3/3/3/2x2',
                    '35/40'
                ),
                ej(
                    'Peso muerto convencional',
                    'Podés sumar elevación de hombros en las series de aproximación',
                    '3x3',
                    '3x3 (día fácil)',
                    '3x3 (fácil)',
                    '3x2',
                    ''
                ),
                ej(
                    'Floor press c/barra',
                    '',
                    '5/5/2x3',
                    '5/5/2x4',
                    '5/5/3x3',
                    '5/5/3x4',
                    '35/40/46'
                ),
                ej(
                    'Puentes con barra (tronco en 30cm)',
                    'Solo apoyo de talones',
                    '8/8/8/2x6',
                    '8/8/8/3x6',
                    '8/8/8/2x8',
                    '8/8/8/2x6',
                    ''
                ),
            ],
        },
        {
            titulo: 'Día 2 — Tren inferior / superior',
            descripcion: '',
            bloqueActivacion: 'Tirones altos / arranque parado',
            ejercicios: [
                ej(
                    'Arranque parado (desde colgado) x1 + desde el suelo x3',
                    '',
                    'x4 rep 10°',
                    'x4/x3 5°/5°',
                    'x3 10°',
                    'x4 10°',
                    ''
                ),
                ej(
                    'Sentadilla sumo c/barra atrás (con banco 30cm atrás)',
                    '',
                    '6x6',
                    '7x5',
                    '6x8',
                    '6x5 (peso sem 1)',
                    ''
                ),
                ej(
                    'Remo en banco plano c/barra prono',
                    '',
                    '6/6/6/6',
                    '5/5/5/5/5',
                    '4/4/4/4/4/4',
                    '5/5/5/5',
                    ''
                ),
                ej(
                    'Estocadas cruzadas atrás c/barra',
                    '',
                    '5/5/3x4',
                    '5/5/3x5',
                    '5/5/2x4/2x4',
                    '5/5/3x4',
                    ''
                ),
            ],
        },
        {
            titulo: 'Día 3 — Tren inferior / superior',
            descripcion: '',
            bloqueActivacion: 'Emp fuerza c/barra atrás / 2do tiempo',
            ejercicios: [
                ej(
                    '2do tiempo en tijera c/barra atrás',
                    '',
                    '4/4/2x4/2x3',
                    '4/4/4/3x3',
                    '4/4/3/3/2x3',
                    '4/4/2x4/2x3',
                    ''
                ),
                ej(
                    'Peso muerto convencional (día difícil)',
                    '',
                    '3x3',
                    '3x4',
                    '3x5',
                    '3x3 (sem 1)',
                    '110-112'
                ),
                ej(
                    'Floor press c/barra',
                    '',
                    '5/5/2x4',
                    '5/5/3x3',
                    '5/5/3x4',
                    '5/5/3x5',
                    '35/40/46'
                ),
                ej(
                    'Sentadilla anterior',
                    'Últimas 2 series: -30kg',
                    '12/10/8/5/2x12',
                    '12/10/8/5/2x15',
                    '12/10/8/5/2x18',
                    '12/10/8/5/2x12',
                    ''
                ),
            ],
        },
    ],
};

async function run() {
    const client = new MongoClient(ATLAS_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        // 1. Encontrar el gimnasio Sport Time
        const gimnasio = await db.collection('gimnasios').findOne({
            nombre: { $regex: /sport/i },
        });
        if (!gimnasio) { console.error('❌ Gimnasio Sport Time no encontrado'); return; }
        console.log(`✅ Gimnasio: ${gimnasio.nombre} (${gimnasio._id})`);

        // 2. Encontrar a Victoria entre los usuarios
        const victoria = await db.collection('usuarios').findOne({
            gimnasioId: gimnasio._id,
            $or: [
                { nombre: { $regex: /victoria/i } },
                { apellido: { $regex: /cardonati/i } },
            ],
        });
        if (!victoria) { console.error('❌ Victoria no encontrada en usuarios'); return; }
        console.log(`✅ Usuario: ${victoria.nombre} ${victoria.apellido} (${victoria._id})`);

        // 3. Crear Alumno vinculado si no existe
        let alumnoId = victoria.alumnoVinculadoId;
        if (!alumnoId) {
            const now = new Date();
            const alumnoDoc = {
                nombre: victoria.nombre || 'Victoria',
                apellido: victoria.apellido || 'Cardonati',
                fechaNacimiento: victoria.fechaNacimiento || new Date('2001-12-27'),
                dni: victoria.dni || '00000000',
                asistencia: [],
                pagos: [],
                planEntrenamiento: { fechaInicio: null, duracion: null, diasRestantes: null, terminado: false },
                planEntrenamientoHistorial: [],
                gimnasioId: gimnasio._id,
                createdAt: now,
                updatedAt: now,
            };
            const res = await db.collection('alumnos').insertOne(alumnoDoc);
            alumnoId = res.insertedId;
            await db.collection('usuarios').updateOne(
                { _id: victoria._id },
                { $set: { alumnoVinculadoId: alumnoId } }
            );
            console.log(`✅ Alumno creado: ${alumnoId}`);
        } else {
            console.log(`✅ Alumno ya existía: ${alumnoId}`);
        }

        // 4. Borrar plan anterior si existe
        const deleted = await db.collection('planalumnos').deleteMany({ alumnoId: new ObjectId(String(alumnoId)) });
        if (deleted.deletedCount > 0) console.log(`🗑️  Plan anterior eliminado`);

        // 5. Insertar el nuevo plan
        const fullPlan = {
            ...planDoc,
            gimnasioId: gimnasio._id,
            alumnoId: new ObjectId(String(alumnoId)),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const planRes = await db.collection('planalumnos').insertOne(fullPlan);
        console.log(`✅ Plan insertado: ${planRes.insertedId}`);
        console.log(`\n🎉 Todo listo. Victoria puede ver su plan en /mi-perfil`);

    } finally {
        await client.close();
    }
}

run().catch(console.error);
