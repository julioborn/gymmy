import mongoose from 'mongoose';

const EjercicioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
});

export default mongoose.models.Ejercicio || mongoose.model('Ejercicio', EjercicioSchema, 'ejercicios');
