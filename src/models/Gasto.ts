import mongoose, { Schema, Document } from 'mongoose';

export interface IGasto extends Document {
    fecha: string;
    detalle: string;
    importe: number;
}

const GastoSchema: Schema = new Schema({
    fecha: { type: String, required: true },
    detalle: { type: String, required: true },
    importe: { type: Number, required: true },
});

export default mongoose.models.Gasto || mongoose.model<IGasto>('Gasto', GastoSchema);
