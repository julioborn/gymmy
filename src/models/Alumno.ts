import mongoose, { Schema, Document } from 'mongoose';

// Interfaz para los pagos
interface IPago {
    mes: string;
    fechaPago: Date;
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
}

// Interfaz para el alumno
interface IAlumno extends Document {
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    dni: string;
    asistencia: IAsistencia[];
    pagos: IPago[]; // Array de pagos
    planEntrenamiento: IPlanEntrenamiento; // Plan de entrenamiento
}

// Esquema para la asistencia
const AsistenciaSchema: Schema = new Schema({
    fecha: { type: Date, required: true },
    presente: { type: Boolean, required: true },
    actividad: { type: String, required: true, enum: ['Musculación', 'Intermitente', 'Otro'] }
});

// Esquema para el plan de entrenamiento
const PlanEntrenamientoSchema: Schema = new Schema({
    fechaInicio: { type: Date, required: false }, // Inicialmente vacío, no es requerido
    duracion: { type: Number, required: false }   // Inicialmente vacío, no es requerido
});

// Esquema para el alumno
const AlumnoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    dni: { type: String, required: true },
    fechaNacimiento: { type: Date, required: true },
    asistencia: [AsistenciaSchema], // Array de asistencias
    pagos: [{
        mes: { type: String, required: true },
        fechaPago: { type: Date, required: true }
    }], // Array de pagos
    planEntrenamiento: {
        type: PlanEntrenamientoSchema,
        default: { fechaInicio: null, duracion: null } // Inicialmente vacío
    }
});

// Verifica si el modelo ya está definido
const Alumno = mongoose.models.Alumno || mongoose.model<IAlumno>('Alumno', AlumnoSchema);

export default Alumno;
