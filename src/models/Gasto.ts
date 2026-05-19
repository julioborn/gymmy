import mongoose, { Schema, Document } from 'mongoose';

export interface IGasto extends Document {
    fecha: Date;
    detalle: string;
    importe: number;
    gimnasioId: mongoose.Types.ObjectId;
}

const GastoSchema: Schema = new Schema({
    fecha: { type: Date, required: true },
    detalle: { type: String, required: true },
    importe: { type: Number, required: true },
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
});

export default mongoose.models.Gasto || mongoose.model<IGasto>('Gasto', GastoSchema);
