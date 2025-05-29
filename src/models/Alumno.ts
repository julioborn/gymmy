import mongoose, { Schema, Document } from 'mongoose';

// Interfaz para los pagos
interface IPago {
    mes: string;
    fechaPago: Date;
    tarifa: number;
    diasMusculacion: number;
    metodoPago: 'efectivo' | 'transferencia';
}

// Interfaz para la asistencia
interface IAsistencia {
    fecha: Date;
    presente: boolean;
    actividad: string;
}

// Interfaz para el alumno
export interface IAlumno extends Document {
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    dni: string;
    telefono?: string;
    email?: string;
    asistencia: IAsistencia[];
    diasEntrenaSemana?: number | null;
    pagos: IPago[];
    planEntrenamiento: IPlanEntrenamiento;
    planEntrenamientoHistorial: IPlanEntrenamientoHistorial[];
    // Nuevos campos
    fechaInicio?: Date | null;
    horarioEntrenamiento?: 'mañana' | 'siesta' | 'tarde' | null;
    horaExactaEntrenamiento?: string | null;
    historialDeportivo?: string;
    historialDeVida?: string;
    objetivos?: string;
    patologias?: string;
}

// Interfaz para el plan de entrenamiento
interface IPlanEntrenamiento {
    fechaInicio: Date | null;
    duracion: number | null;
    diasRestantes: number | null;
    terminado: boolean;
}

// Interfaz para el historial de planes finalizados
interface IPlanEntrenamientoHistorial extends IPlanEntrenamiento {
    fechaFin: Date;
    asistenciasContadas: number;
    horarioMasFrecuente?: string;
}

// Subesquemas
const AsistenciaSchema: Schema = new Schema({
    fecha: { type: Date, required: true },
    presente: { type: Boolean, required: true },
    actividad: { type: String, required: true, enum: ['Musculación', 'Intermitente', 'Otro'] },
});

const PlanEntrenamientoSchema: Schema = new Schema({
    fechaInicio: { type: Date, required: false },
    duracion: { type: Number, required: false },
    diasRestantes: { type: Number, default: null },
    terminado: { type: Boolean, default: false },
});

const PlanEntrenamientoHistorialSchema: Schema = new Schema({
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    duracion: { type: Number, required: true },
    asistenciasContadas: { type: Number, required: true },
    horarioMasFrecuente: { type: String, required: false },
});

// Esquema principal del Alumno
const AlumnoSchema = new mongoose.Schema<IAlumno>({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    dni: { type: String, required: true },
    telefono: { type: String, required: false, default: null },
    email: { type: String, required: false, default: null },
    fechaNacimiento: { type: Date, required: true },
    diasEntrenaSemana: { type: Number, required: false, default: null },
    asistencia: [AsistenciaSchema],
    pagos: [
        {
            mes: { type: String, required: true },
            fechaPago: { type: Date, required: true },
            tarifa: { type: Number, required: true },
            diasMusculacion: { type: Number, required: true },
            metodoPago: { type: String, required: true, enum: ['efectivo', 'transferencia'] },
            recargo: { type: Number, required: false, default: 0 },
        },
    ],
    planEntrenamiento: {
        type: PlanEntrenamientoSchema,
        default: { fechaInicio: null, duracion: null, diasRestantes: null, terminado: false },
    },
    // Nuevos campos opcionales
    fechaInicio: { type: Date, required: false, default: null },
    horarioEntrenamiento: {
        type: String,
        required: false,
        enum: ['mañana', 'siesta', 'tarde'],
        default: null
    },
    planEntrenamientoHistorial: {
        type: [PlanEntrenamientoHistorialSchema],
        default: [],
    },
    horaExactaEntrenamiento: { type: String, required: false, default: null }, // Nueva línea
    historialDeportivo: { type: String, required: false, default: "" },
    historialDeVida: { type: String, required: false, default: "" },
    objetivos: { type: String, required: false, default: "" },
    patologias: { type: String, required: false, default: "" },
});

// Exportar modelo
const Alumno = mongoose.models.Alumno || mongoose.model<IAlumno>('Alumno', AlumnoSchema);
export default Alumno;
