import mongoose from 'mongoose';

const connectMongoDB = async () => {
    // Obtener el URI de la base de datos desde las variables de entorno
    const uri = process.env.USE_ATLAS === "true" ? process.env.ATLAS_URI : process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("No se encontró el URI para MongoDB. Verifica tus variables de entorno.");
    }

    if (mongoose.connection.readyState === 1) return;

    try {
        await mongoose.connect(uri);
    } catch (error) {
        throw error;
    }
};

export default connectMongoDB;