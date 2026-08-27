import mongoose, { Schema, Document } from 'mongoose';

export interface IGimnasio extends Document {
    nombre: string;
    activo: boolean;
    fechaVencimiento?: Date;
    mercadopagoAccessToken?: string;
    alias?: string;
    slug?: string;
    logoUrl?: string;
    logoHeaderUrl?: string;
    temaFondo?: string;
    temaAcento?: string;
    temaAcento2?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GimnasioSchema = new Schema<IGimnasio>({
    nombre: { type: String, required: true },
    activo: { type: Boolean, default: true },
    fechaVencimiento: { type: Date },
    mercadopagoAccessToken: { type: String },
    alias: { type: String },
    slug: { type: String },
    logoUrl: { type: String },
    logoHeaderUrl: { type: String },
    temaFondo: { type: String },
    temaAcento: { type: String },
    temaAcento2: { type: String },
}, { timestamps: true });

export default mongoose.models.Gimnasio || mongoose.model<IGimnasio>('Gimnasio', GimnasioSchema);
