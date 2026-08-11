import mongoose from 'mongoose';

const EjercicioCalorSchema = new mongoose.Schema({
    nombre: { type: String, default: '' },
    notas: { type: String, default: '' },
}, { _id: false });

const EjercicioPlanSchema = new mongoose.Schema({
    nombre: { type: String, default: '' },
    notas: { type: String, default: '' },
    semana1_5: { type: String, default: '' },
    semana2_6: { type: String, default: '' },
    semana3: { type: String, default: '' },
    semana4: { type: String, default: '' },
    kg: { type: String, default: '' },
}, { _id: false });

const DiaSchema = new mongoose.Schema({
    titulo: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    bloqueActivacion: { type: String, default: '' },
    ejercicios: { type: [EjercicioPlanSchema], default: [] },
}, { _id: false });

const PlantillaEntrenamientoSchema = new mongoose.Schema({
    gimnasioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gimnasio', required: true },
    nombre: { type: String, required: true },
    categoria: { type: String, required: true },
    descripcion: { type: String, default: '' },
    entradaCalor: {
        ejercicios: { type: [EjercicioCalorSchema], default: [] },
    },
    dias: { type: [DiaSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.PlantillaEntrenamiento ||
    mongoose.model('PlantillaEntrenamiento', PlantillaEntrenamientoSchema, 'plantillas_entrenamiento');
