import mongoose from 'mongoose';

declare global {
    // eslint-disable-next-line no-var
    var _mongooseConnPromise: Promise<typeof mongoose> | undefined;
}

const connectMongoDB = async () => {
    const uri = process.env.USE_ATLAS === 'true' ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('No se encontró el URI para MongoDB. Verifica tus variables de entorno.');

    // Already connected
    if (mongoose.connection.readyState === 1) return;

    // Cache the connection promise so concurrent requests share the same connect() call
    if (!global._mongooseConnPromise) {
        global._mongooseConnPromise = mongoose.connect(uri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 10000,
        });
    }

    await global._mongooseConnPromise;
};

export default connectMongoDB;
