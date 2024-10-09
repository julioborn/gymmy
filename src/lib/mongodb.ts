// src/lib/mongodb.ts
import mongoose from 'mongoose';

const connectMongoDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return; // Si ya estamos conectados
    }

    try {
        await mongoose.connect('mongodb://localhost:27017/gimnasio');
        console.log("Conectado a la base de datos gimnasio");
    } catch (error) {
        console.error("Error de conexión a MongoDB:", error);
    }
};

export default connectMongoDB;
