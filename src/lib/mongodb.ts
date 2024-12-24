import mongoose from 'mongoose';

const connectMongoDB = async () => {
    // Obtener el URI de la base de datos desde las variables de entorno
    const uri = process.env.USE_ATLAS === "true" ? process.env.ATLAS_URI : process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("No se encontró el URI para MongoDB. Verifica tus variables de entorno.");
    }

    // Evitar reconexiones múltiples
    if (mongoose.connection.readyState === 1) {
        console.log("Ya conectado a MongoDB");
        return;
    }

    try {
        await mongoose.connect(uri); // Sin necesidad de opciones adicionales
        console.log(`Conectado a MongoDB en: ${uri}`);
    } catch (error) {
        console.error("Error de conexión a MongoDB:", error);
    }
};

export default connectMongoDB;