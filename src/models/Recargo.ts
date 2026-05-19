import mongoose, { Schema, Document } from "mongoose";

interface IRecargo extends Document {
    monto: number;
    gimnasioId: mongoose.Types.ObjectId;
}

const RecargoSchema: Schema = new Schema({
    monto: { type: Number, required: true },
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
});

export default mongoose.models.Recargo || mongoose.model<IRecargo>("Recargo", RecargoSchema, "recargo");
