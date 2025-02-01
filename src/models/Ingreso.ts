import mongoose, { Schema, Document } from 'mongoose';

export interface IIngreso extends Document {
    fecha: string;
    detalle: string;
    importe: number;
}

const IngresoSchema: Schema = new Schema({
    fecha: { type: String, required: true },
    detalle: { type: String, required: true },
    importe: { type: Number, required: true },
});

export default mongoose.models.Ingreso || mongoose.model<IIngreso>('Ingreso', IngresoSchema);
