import mongoose, { Schema, Document } from "mongoose";

interface IRecargo extends Document {
    montoDiez: number;
    montoMes: number;
    gimnasioId: mongoose.Types.ObjectId;
}

const RecargoSchema: Schema = new Schema({
    montoDiez: { type: Number, required: true, default: 0 },
    montoMes: { type: Number, required: true, default: 0 },
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
});

export default mongoose.models.Recargo || mongoose.model<IRecargo>("Recargo", RecargoSchema, "recargo");
