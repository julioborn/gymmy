import mongoose, { Schema, Document } from 'mongoose';

// Interfaz para los pagos
interface IPago {
    mes: string;
    fechaPago: Date;
    tarifa: number; // Tarifa asignada
    diasMusculacion: number; // Días de musculación por semana
    metodoPago: 'efectivo' | 'transferencia'; // Método de pago
}

// Interfaz para la asistencia
interface IAsistencia {
    fecha: Date;
    presente: boolean;
    actividad: string; // Musculación, Intermitente, Otro
}

// Interfaz para el plan de entrenamiento
interface IPlanEntrenamiento {
    fechaInicio: Date | null;
    duracion: number | null;
    diasRestantes: number | null;
    terminado: boolean;
}

// Interfaz para el alumno
interface IAlumno extends Document {
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    dni: string;
    telefono?: string; // Ahora es opcional
    email?: string; // Ahora es opcional
    asistencia: IAsistencia[];
    diasEntrenaSemana?: number | null; // Nueva propiedad (opcional)
    pagos: IPago[];
    planEntrenamiento: IPlanEntrenamiento;
}

// Esquema para la asistencia
const AsistenciaSchema: Schema = new Schema({
    fecha: { type: Date, required: true },
    presente: { type: Boolean, required: true },
    actividad: { type: String, required: true, enum: ['Musculación', 'Intermitente', 'Otro'] },
});

// Esquema para el plan de entrenamiento
const PlanEntrenamientoSchema: Schema = new Schema({
    fechaInicio: { type: Date, required: false }, // Fecha de inicio del plan
    duracion: { type: Number, required: false }, // Duración del plan en días
    diasRestantes: { type: Number, default: null }, // Días restantes del plan
    terminado: { type: Boolean, default: false }, // Estado de terminado o no del plan
});

// Esquema para el alumno
const AlumnoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    dni: { type: String, required: true },
    telefono: { type: String, required: false, default: null }, // Ahora es opcional
    email: { type: String, required: false, default: null }, // Ahora es opcional
    diasEntrenaSemana: { type: Number, required: false, default: null }, // Nueva propiedad
    fechaNacimiento: { type: Date, required: true },
    asistencia: [AsistenciaSchema],
    pagos: [
        {
            mes: { type: String, required: true },
            fechaPago: { type: Date, required: true },
            tarifa: { type: Number, required: true },
            diasMusculacion: { type: Number, required: true },
            metodoPago: { type: String, required: true, enum: ['efectivo', 'transferencia'] }, // Método de pago
        },
    ],
    planEntrenamiento: {
        type: PlanEntrenamientoSchema,
        default: { fechaInicio: null, duracion: null, diasRestantes: null, terminado: false },
    },
});

// Verifica si el modelo ya está definido
const Alumno = mongoose.models.Alumno || mongoose.model<IAlumno>('Alumno', AlumnoSchema);

export default Alumno;