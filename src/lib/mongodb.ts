import mongoose from 'mongoose';

const localURI = 'mongodb://localhost:27017/gimnasio'
const atlasURI = 'mongodb+srv://julioborn:Estudiob123@gymmycluster.ooyeh.mongodb.net/gymmy';


const connectMongoDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return; // Si ya estamos conectados
    }

    try {
        await mongoose.connect(localURI);
        console.log("Conectado a la base de datos gimnasio");
    } catch (error) {
        console.error("Error de conexión a MongoDB:", error);
    }
};

export default connectMongoDB;
