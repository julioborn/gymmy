import transporter from './email';

//const EMAIL_USER = process.env.EMAIL_USER as string;

// Define el tipo para las asistencias
type Asistencia = {
    fecha: string;
    actividad: string;
};

// Función para calcular estadísticas del alumno
const calcularEstadisticasAlumno = (asistencia: Asistencia[], fechaInicioPlan: string) => {
    // Filtrar asistencias desde la fecha de inicio del plan
    const asistenciasFiltradas = asistencia.filter((item) =>
        new Date(item.fecha) >= new Date(fechaInicioPlan)
    );

    if (!asistenciasFiltradas.length) {
        return {
            diaFrecuente: 'N/A',
            porcentajePorActividad: {} as Record<string, string>,
            diasTotales: 0,
        };
    }

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const frecuenciaPorDia = asistenciasFiltradas.reduce((acc: Record<string, number>, item) => {
        const dia = diasSemana[new Date(item.fecha).getDay()];
        acc[dia] = (acc[dia] || 0) + 1;
        return acc;
    }, {});

    const diaFrecuente = Object.keys(frecuenciaPorDia).reduce((a, b) =>
        frecuenciaPorDia[a] > frecuenciaPorDia[b] ? a : b
    );

    const totalAsistencias = asistenciasFiltradas.length;
    const actividades = asistenciasFiltradas.reduce((acc: Record<string, number>, item) => {
        acc[item.actividad] = (acc[item.actividad] || 0) + 1;
        return acc;
    }, {});

    const porcentajePorActividad = Object.entries(actividades).reduce((acc, [actividad, cantidad]) => {
        acc[actividad] = ((cantidad / totalAsistencias) * 100).toFixed(2) + '%';
        return acc;
    }, {} as Record<string, string>);

    return {
        diaFrecuente,
        porcentajePorActividad,
        diasTotales: totalAsistencias,
    };
};

// Función para enviar correo
export const enviarCorreoPlanTerminado = async (
    email: string | null,
    nombre: string,
    asistencia: Asistencia[],
    plan: { fechaInicio: string; duracion: number }
) => {
    if (!email) {
        console.log('No se envió el correo porque el email no está definido.');
        return;
    }

    const estadisticas = calcularEstadisticasAlumno(asistencia, plan.fechaInicio);
    const fechaInicio = new Date(plan.fechaInicio);
    const fechaTermino = new Date(fechaInicio);
    fechaTermino.setDate(fechaInicio.getDate() + plan.duracion);

    const mailOptions = {
        from: 'SPORT-TIME',
        to: email,
        subject: 'TU PLAN DE ENTRENAMIENTO HA TERMINADO',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <img src="https://res.cloudinary.com/dwz4lcvya/image/upload/v1734544069/sporttime2_hpsekr.jpg" alt="Gimnasio" style="width: 100%; height: auto; display: block; border-bottom: 1px solid #ddd;">
                <div style="padding: 20px; background-color: #f9a547">
                    <h1 style="color: #000000; text-align: center; font-size: 24px; margin-bottom: 10px;">¡Hola, ${nombre}!</h1>
                    <h2 style="text-align: center; font-size: 16px; color: #555;">Felicitaciones por completar tu plan de entrenamiento.</h2>
                    
                    <hr style="border: none; border-top: 1px solid #000000; margin: 20px 0;">
                    
                    <p style="font-size: 16px; color: #333;">Estas son algunas estadísticas sobre tu desempeño del plan:</p>
                    <ul style="list-style: none; padding: 0; margin: 20px 0;">
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Día más frecuente:</strong> ${estadisticas.diaFrecuente}
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Días totales asistidos:</strong> ${estadisticas.diasTotales}
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Porcentaje por actividad:</strong>
                            <ul style="list-style: none; padding: 0; margin-top: 5px;">
                                ${Object.entries(estadisticas.porcentajePorActividad)
                .map(([actividad, porcentaje]) => `<li>${actividad}: ${porcentaje}</li>`)
                .join('')}
                            </ul>
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Duración del plan:</strong> ${plan.duracion} días
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Fecha de inicio del plan:</strong> ${fechaInicio.toLocaleDateString('es-ES')}
                        </li>
                        <li style="margin-bottom: 10px; font-size: 14px;">
                            <strong style="color: #000000;">Fecha de finalización del plan:</strong> ${fechaTermino.toLocaleDateString('es-ES')}
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
        console.log(`Correo enviado a ${email}`);
    } catch (error) {
        console.error('Error enviando correo:', error);
    }
};

