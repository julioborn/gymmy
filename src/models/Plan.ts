import mongoose from 'mongoose';

const SerieSchema = new mongoose.Schema({
    repeticiones: { type: Number, required: true },
    peso: { type: Number, required: true },
});

const EjercicioSchema = new mongoose.Schema({
    ejercicioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejercicio', required: true },
    nombre: { type: String, required: true },
    series: { type: [SerieSchema], required: true },
});

const PlanSchema = new mongoose.Schema({
    alumno: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumno', required: true },
    ejercicios: { type: [EjercicioSchema], required: true },
});

export default mongoose.models.Plan || mongoose.model('Plan', PlanSchema, 'planes'); // Nombre explícito de la colección
