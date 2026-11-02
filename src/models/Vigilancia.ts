import mongoose, { Schema, Document } from 'mongoose';

export interface IVigilancia extends Document {
    gimnasioId: mongoose.Types.ObjectId;
    watcherAlumnoId: mongoose.Types.ObjectId;
    alumnoId: mongoose.Types.ObjectId;
}

const VigilanciaSchema = new Schema<IVigilancia>({
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
    watcherAlumnoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumno', required: true },
    alumnoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumno', required: true },
}, { timestamps: true });

VigilanciaSchema.index({ watcherAlumnoId: 1, alumnoId: 1 }, { unique: true });

const Vigilancia = mongoose.models.Vigilancia || mongoose.model<IVigilancia>('Vigilancia', VigilanciaSchema);
export default Vigilancia;
