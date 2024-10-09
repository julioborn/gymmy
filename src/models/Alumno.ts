import mongoose, { Schema, Document } from 'mongoose';

interface IAsistencia {
    fecha: Date;
    presente: boolean;
    actividad: string; // Agregar el tipo de actividad: Musculación, Intermitente, Otro
}

interface IAlumno extends Document {
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    dni: string;
    asistencia: IAsistencia[];
}

const AsistenciaSchema: Schema = new Schema({
    fecha: { type: Date, required: true },
    presente: { type: Boolean, required: true },
    actividad: { type: String, required: true, enum: ['Musculación', 'Intermitente', 'Otro'] }
});

const AlumnoSchema: Schema = new Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    fechaNacimiento: { type: Date, required: true },
    dni: { type: String, required: true },
    asistencia: { type: [AsistenciaSchema], default: [] } // Cambiado para incluir la nueva estructura de asistencia
});

// Verifica si el modelo ya está definido
const Alumno = mongoose.models.Alumno || mongoose.model<IAlumno>('Alumno', AlumnoSchema);

export default Alumno;
