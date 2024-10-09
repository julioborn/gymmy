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

// Interfaz para el alumno
interface IAlumno extends Document {
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    dni: string;
    asistencia: IAsistencia[];
    pagos: IPago[]; // Array de pagos
}

// Esquema para la asistencia
const AsistenciaSchema: Schema = new Schema({
    fecha: { type: Date, required: true },
    presente: { type: Boolean, required: true },
    actividad: { type: String, required: true, enum: ['Musculación', 'Intermitente', 'Otro'] }
});

// Esquema para el alumno
const AlumnoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    dni: {
        type: String,
        required: true
    },
    fechaNacimiento: {
        type: Date,
        required: true
    },
    asistencia: {
        type: [AsistenciaSchema], // Array de asistencias
        default: [] // Se inicializa como un array vacío
    },
    pagos: [{
        mes: {
            type: String,
            required: true
        },
        fechaPago: {
            type: Date,
            required: true
        }
    }] // Array de pagos
});

// Verifica si el modelo ya está definido
const Alumno = mongoose.models.Alumno || mongoose.model<IAlumno>('Alumno', AlumnoSchema);

export default Alumno;
