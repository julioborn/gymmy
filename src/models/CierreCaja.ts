import mongoose, { Schema, Document } from 'mongoose';

export interface ICierreCaja extends Document {
    gimnasioId: mongoose.Types.ObjectId;
    fechaDesde: Date;
    fechaHasta: Date;
    totalEfectivo: number;
    totalTransferencia: number;
    totalOtros: number;
    totalGeneral: number;
    cantidadPagos: number;
    registradoPorId: mongoose.Types.ObjectId;
    registradoPorNombre: string;
}

const CierreCajaSchema: Schema = new Schema(
    {
        gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
        fechaDesde: { type: Date, required: true },
        fechaHasta: { type: Date, required: true },
        totalEfectivo: { type: Number, required: true, default: 0 },
        totalTransferencia: { type: Number, required: true, default: 0 },
        totalOtros: { type: Number, required: true, default: 0 },
        totalGeneral: { type: Number, required: true, default: 0 },
        cantidadPagos: { type: Number, required: true, default: 0 },
        registradoPorId: { type: mongoose.Schema.Types.ObjectId, required: true },
        registradoPorNombre: { type: String, required: true },
    },
    { timestamps: true },
);

CierreCajaSchema.index({ gimnasioId: 1, fechaHasta: -1 });

export default mongoose.models.CierreCaja || mongoose.model<ICierreCaja>('CierreCaja', CierreCajaSchema, 'cierres_caja');
