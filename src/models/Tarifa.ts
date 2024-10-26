import mongoose, { Schema, Document } from 'mongoose';

// Interfaz para la tarifa
interface ITarifa extends Document {
    diasMusculacion: number;
    tarifa: number;
}

const TarifaSchema: Schema = new Schema({
    diasMusculacion: { type: Number, required: true, unique: true },
    tarifa: { type: Number, required: true }
});

const Tarifa = mongoose.models.Tarifa || mongoose.model<ITarifa>('Tarifa', TarifaSchema);

export default Tarifa;
