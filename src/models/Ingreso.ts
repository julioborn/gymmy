import mongoose, { Schema, Document } from 'mongoose';

export interface IIngreso extends Document {
    fecha: Date;
    detalle: string;
    importe: number;
    gimnasioId: mongoose.Types.ObjectId;
}

const IngresoSchema: Schema = new Schema({
    fecha: { type: Date, required: true },
    detalle: { type: String, required: true },
    importe: { type: Number, required: true },
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
});

IngresoSchema.index({ gimnasioId: 1, fecha: -1 });

export default mongoose.models.Ingreso || mongoose.model<IIngreso>('Ingreso', IngresoSchema);
