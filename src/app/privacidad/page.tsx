export const metadata = {
    title: 'Política de Privacidad – Gymmy',
};

export default function PrivacidadPage() {
    return (
        <main className="max-w-2xl mx-auto px-6 py-12 text-slate-300">
            <h1 className="text-2xl font-bold text-white mb-2">Política de Privacidad</h1>
            <p className="text-sm text-slate-500 mb-8">Última actualización: mayo 2025</p>

            <section className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">1. Información que recopilamos</h2>
                <p className="text-sm">Gymmy recopila la siguiente información de los usuarios registrados:</p>
                <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                    <li>Nombre y apellido</li>
                    <li>Número de DNI</li>
                    <li>Fecha de nacimiento</li>
                    <li>Correo electrónico y teléfono (opcionales)</li>
                    <li>Historial de asistencias y pagos</li>
                    <li>Token de dispositivo para notificaciones push</li>
                </ul>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">2. Uso de la información</h2>
                <p className="text-sm">La información recopilada se utiliza exclusivamente para:</p>
                <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                    <li>Gestionar la membresía y asistencia al gimnasio</li>
                    <li>Registrar y notificar pagos de cuotas</li>
                    <li>Enviar notificaciones push relacionadas con la actividad del usuario</li>
                    <li>Generar estadísticas internas del gimnasio</li>
                </ul>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">3. Notificaciones push</h2>
                <p className="text-sm">
                    Con tu consentimiento, Gymmy puede enviarte notificaciones push para informarte sobre pagos registrados, inicio de planes de entrenamiento y recordatorios de asistencia. Podés revocar este permiso en cualquier momento desde la configuración de tu dispositivo.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">4. Almacenamiento y seguridad</h2>
                <p className="text-sm">
                    Los datos se almacenan de forma segura en servidores en la nube con acceso restringido. Las contraseñas se guardan cifradas y nunca en texto plano.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">5. Compartir información</h2>
                <p className="text-sm">
                    Gymmy no vende, alquila ni comparte información personal con terceros. Los datos son accesibles únicamente por el gimnasio al que pertenece el usuario.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">6. Eliminación de datos</h2>
                <p className="text-sm">
                    Podés solicitar la eliminación de tu cuenta y datos personales contactándote con el administrador de tu gimnasio o escribiéndonos a <strong className="text-white">gymmy.app.ar@gmail.com</strong>.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">7. Contacto</h2>
                <p className="text-sm">
                    Para consultas sobre privacidad escribinos a <strong className="text-white">gymmy.app.ar@gmail.com</strong>.
                </p>
            </section>
        </main>
    );
}
