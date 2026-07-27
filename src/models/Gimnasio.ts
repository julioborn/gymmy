import mongoose, { Schema, Document } from 'mongoose';

export interface IGimnasio extends Document {
    nombre: string;
    activo: boolean;
    fechaVencimiento?: Date;
    mercadopagoAccessToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GimnasioSchema = new Schema<IGimnasio>({
    nombre: { type: String, required: true },
    activo: { type: Boolean, default: true },
    fechaVencimiento: { type: Date },
    mercadopagoAccessToken: { type: String },
}, { timestamps: true });

export default mongoose.models.Gimnasio || mongoose.model<IGimnasio>('Gimnasio', GimnasioSchema);
