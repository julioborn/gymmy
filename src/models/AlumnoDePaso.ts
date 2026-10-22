import mongoose, { Schema, Document } from 'mongoose';

export interface IAlumnoDePaso extends Document {
    nombre: string;
    apellido: string;
    actividad: string;
    monto: number;
    metodoPago: string;
    fecha: Date;
    gimnasioId: mongoose.Types.ObjectId;
}

const AlumnoDePasoSchema: Schema = new Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    actividad: { type: String, required: true, default: 'Musculación' },
    monto: { type: Number, required: true, default: 0 },
    metodoPago: { type: String, required: true, default: 'efectivo' },
    fecha: { type: Date, required: true, default: Date.now },
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
});

AlumnoDePasoSchema.index({ gimnasioId: 1, fecha: -1 });

export default mongoose.models.AlumnoDePaso || mongoose.model<IAlumnoDePaso>('AlumnoDePaso', AlumnoDePasoSchema, 'alumnos_de_paso');
