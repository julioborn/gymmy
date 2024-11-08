import mongoose, { Schema, Document } from 'mongoose';

interface ITarifa extends Document {
    dias: number; // Representa los días de entrenamiento por semana
    valor: number; // Valor de la tarifa para esos días
}

const TarifaSchema: Schema = new Schema({
    dias: { type: Number, required: true, unique: true }, // Debe ser único para cada número de días (1 a 5)
    valor: { type: Number, required: true }, // Valor de la tarifa para esos días
});

export default mongoose.models.Tarifa || mongoose.model<ITarifa>('Tarifa', TarifaSchema);
