import mongoose, { Schema, Document } from 'mongoose';

export interface IEjercicioPlanAlumno {
    nombre: string;
    notas: string;
    semana1_5: string;
    semana2_6: string;
    semana3: string;
    semana4: string;
    kg: string;
    kgAlumno: string;
    observacionesAlumno: string;
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
    semana1_5: { type: String, default: '' },
    semana2_6: { type: String, default: '' },
    semana3: { type: String, default: '' },
    semana4: { type: String, default: '' },
    kg: { type: String, default: '' },
    kgAlumno: { type: String, default: '' },
    observacionesAlumno: { type: String, default: '' },
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
    entradaCalor: {
        ejercicios: { type: [{ nombre: String, notas: String }], default: [] },
    },
    dias: { type: [DiaSchema], default: [] },
    activo: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.PlanAlumno || mongoose.model<IPlanAlumno>('PlanAlumno', PlanAlumnoSchema);
