import mongoose, { Schema, Document } from "mongoose";

interface IRecargo extends Document {
    monto: number;
}

const RecargoSchema: Schema = new Schema({
    monto: { type: Number, required: true },
});

export default mongoose.models.Recargo || mongoose.model<IRecargo>("Recargo", RecargoSchema, "recargo");
