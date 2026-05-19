import mongoose, { Schema, Document } from 'mongoose';

interface ITarifa extends Document {
    dias: number;
    valor: number;
    gimnasioId: mongoose.Types.ObjectId;
}

const TarifaSchema: Schema = new Schema({
    dias: { type: Number, required: true },
    valor: { type: Number, required: true },
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
});

TarifaSchema.index({ dias: 1, gimnasioId: 1 }, { unique: true });

export default mongoose.models.Tarifa || mongoose.model<ITarifa>('Tarifa', TarifaSchema);
