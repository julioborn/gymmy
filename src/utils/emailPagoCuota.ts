import transporter from './email';

const EMAIL_USER = process.env.EMAIL_USER as string;

export const enviarCorreoPagoCuota = async (email: string, nombre: string, pago: any) => {
    if (!email) {
        console.log('No se envió el correo porque el email no está definido.');
        return;
    }

    const recargoHtml = Number(pago.recargo) > 0
        ?   `<li style="margin-bottom: 10px; font-size: 14px;">
                <strong style="color: #000000;">Recargo aplicado:</strong> $${Number(pago.recargo).toFixed(2)}
            </li>`
        : '';

    const mailOptions = {
        from: EMAIL_USER,
        to: email,
        subject: 'PAGO DE CUOTA',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <img src="https://res.cloudinary.com/dwz4lcvya/image/upload/v1734544069/sporttime2_hpsekr.jpg" alt="Gimnasio" style="width: 100%; height: auto; display: block; border-bottom: 1px solid #ddd;">
                <div style="padding: 20px; background-color: #d1e188">
                    <h1 style="color: #000000; text-align: center; font-size: 24px; margin-bottom: 10px;">¡Hola, ${nombre}!</h1>
                    <p style="text-align: center; font-size: 16px; color: #555;">Hemos registrado correctamente tu pago de la cuota mensual.</p>

                    <hr style="border: none; border-top: 1px solid #000000; margin: 20px 0;">

                    <p style="font-size: 16px; color: #333;">Aquí tienes los detalles del pago:</p>
                    <ul style="list-style: none; padding: 0; margin: 20px 0;">
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Mes:</strong> ${pago.mes}
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Fecha de pago:</strong> ${new Date(pago.fechaPago).toLocaleDateString('es-ES')}
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Precio final:</strong> $${pago.tarifa.toFixed(2)}
                        </li>
                        ${recargoHtml}
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Días de musculación:</strong> ${pago.diasMusculacion} días por semana
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Método de pago:</strong> ${pago.metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                        </li>
                    </ul>

                    <hr style="border: none; border-top: 1px solid #000000; margin: 20px 0;">

                    <p style="text-align: center; font-size: 14px; color: #777;">
                        Gracias por elegirnos como tu gimnasio. <br> ¡Te esperamos para seguir alcanzando tus metas!
                    </p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Correo de pago enviado a ${email}`);
    } catch (error) {
        console.error('Error enviando correo de pago:', error);
    }
};

