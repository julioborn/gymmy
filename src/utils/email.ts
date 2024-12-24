import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER as string;
const EMAIL_PASS = process.env.EMAIL_PASS as string;

// Configuración del transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER, // Correo electrónico
        pass: EMAIL_PASS, // Contraseña de aplicación
    },
});

export default transporter;