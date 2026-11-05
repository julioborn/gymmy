import mongoose, { Schema, Document } from 'mongoose';

export interface IEjercicioPlanAlumno {
    nombre: string;
    notas: string;
    trepada1: string;
    trepada2: string;
    trepada3: string;
    trepada4: string;
    trepada5: string;
    trepada6: string;
    trepada7: string;
    semana1: string;
    semana2: string;
    semana3: string;
    semana4: string;
    semana5: string;
    semana6: string;
    semana7: string;
    kg: string;
    kgAlumno1: string;
    kgAlumno2: string;
    kgAlumno3: string;
    kgAlumno4: string;
    kgAlumno5: string;
    kgAlumno6: string;
    kgAlumno7: string;
    observacionesAlumno1: string;
    observacionesAlumno2: string;
    observacionesAlumno3: string;
    observacionesAlumno4: string;
    observacionesAlumno5: string;
    observacionesAlumno6: string;
    observacionesAlumno7: string;
    grupoCombo: string;
}

export interface IDiaPlanAlumno {
    titulo: string;
    descripcion: string;
    bloqueActivacion: string;
    ejercicios: IEjercicioPlanAlumno[];
}

export interface IPlanAlumno extends Document {
    gimnasioId: mongoose.Types.ObjectId;
    alumnoId: mongoose.Types.ObjectId;
    plantillaId?: mongoose.Types.ObjectId;
    nombre: string;
    categoria: string;
    descripcion: string;
    totalSemanas: number;
    fechaInicio?: Date;
    entradaCalor: {
        ejercicios: { nombre: string; notas: string }[];
    };
    dias: IDiaPlanAlumno[];
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const EjercicioSchema = new Schema({
    nombre: { type: String, default: '' },
    notas: { type: String, default: '' },
    trepada1: { type: String, default: '' },
    trepada2: { type: String, default: '' },
    trepada3: { type: String, default: '' },
    trepada4: { type: String, default: '' },
    trepada5: { type: String, default: '' },
    trepada6: { type: String, default: '' },
    trepada7: { type: String, default: '' },
    semana1: { type: String, default: '' },
    semana2: { type: String, default: '' },
    semana3: { type: String, default: '' },
    semana4: { type: String, default: '' },
    semana5: { type: String, default: '' },
    semana6: { type: String, default: '' },
    semana7: { type: String, default: '' },
    kg: { type: String, default: '' },
    kgAlumno1: { type: String, default: '' },
    kgAlumno2: { type: String, default: '' },
    kgAlumno3: { type: String, default: '' },
    kgAlumno4: { type: String, default: '' },
    kgAlumno5: { type: String, default: '' },
    kgAlumno6: { type: String, default: '' },
    kgAlumno7: { type: String, default: '' },
    observacionesAlumno1: { type: String, default: '' },
    observacionesAlumno2: { type: String, default: '' },
    observacionesAlumno3: { type: String, default: '' },
    observacionesAlumno4: { type: String, default: '' },
    observacionesAlumno5: { type: String, default: '' },
    observacionesAlumno6: { type: String, default: '' },
    observacionesAlumno7: { type: String, default: '' },
    grupoCombo: { type: String, default: '' },
}, { _id: false });

const DiaSchema = new Schema({
    titulo: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    bloqueActivacion: { type: String, default: '' },
    ejercicios: { type: [EjercicioSchema], default: [] },
}, { _id: false });

const PlanAlumnoSchema = new Schema<IPlanAlumno>({
    gimnasioId: { type: Schema.Types.ObjectId, required: true, ref: 'Gimnasio' },
    alumnoId: { type: Schema.Types.ObjectId, required: true, ref: 'Alumno' },
    plantillaId: { type: Schema.Types.ObjectId, ref: 'PlantillaEntrenamiento' },
    nombre: { type: String, required: true },
    categoria: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    totalSemanas: { type: Number, default: 4 },
    fechaInicio: { type: Date },
    entradaCalor: {
        ejercicios: { type: [{ nombre: String, notas: String }], default: [] },
    },
    dias: { type: [DiaSchema], default: [] },
    activo: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.PlanAlumno || mongoose.model<IPlanAlumno>('PlanAlumno', PlanAlumnoSchema);
