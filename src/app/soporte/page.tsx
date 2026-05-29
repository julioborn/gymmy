export default function SoportePage() {
    return (
        <main className="max-w-2xl mx-auto px-6 py-12 text-slate-700">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Soporte</h1>
            <p className="text-sm text-slate-400 mb-8">Centro de ayuda de Gymmy</p>

            <section className="mb-8">
                <h2 className="text-lg font-semibold text-slate-800 mb-3">¿Necesitás ayuda?</h2>
                <p className="text-sm mb-4">
                    Si tenés preguntas, inconvenientes técnicos o necesitás asistencia con la aplicación Gymmy,
                    podés contactarnos por los siguientes medios:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Correo electrónico</p>
                        <a
                            href="mailto:gymmy.app.ar@gmail.com"
                            className="text-sm font-semibold text-emerald-600 hover:underline"
                        >
                            gymmy.app.ar@gmail.com
                        </a>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Horario de atención</p>
                        <p className="text-sm">Lunes a viernes, 9 a 18 hs (Argentina, GMT-3)</p>
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-lg font-semibold text-slate-800 mb-3">Preguntas frecuentes</h2>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">¿Cómo registro un alumno?</p>
                        <p className="text-sm text-slate-600 mt-1">
                            Desde el menú principal, seleccioná &ldquo;Registrar Alumno&rdquo; y completá el formulario con los datos del alumno.
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">¿Cómo registro una asistencia?</p>
                        <p className="text-sm text-slate-600 mt-1">
                            Ingresá al perfil del alumno y presioná &ldquo;Registrar asistencia&rdquo;, o utilizá el modo de ingreso rápido por DNI en la sección correspondiente.
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">¿Cómo solicito la eliminación de mi cuenta?</p>
                        <p className="text-sm text-slate-600 mt-1">
                            Podés solicitar la eliminación de tu cuenta desde la sección &ldquo;Eliminar cuenta&rdquo; de la aplicación o escribiéndonos a{' '}
                            <a href="mailto:gymmy.app.ar@gmail.com" className="text-emerald-600 hover:underline font-semibold">
                                gymmy.app.ar@gmail.com
                            </a>.
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">¿Cómo cambio el precio de las cuotas?</p>
                        <p className="text-sm text-slate-600 mt-1">
                            Desde la pantalla de inicio, presioná el botón &ldquo;Cuotas&rdquo; en la sección Configuración para actualizar los valores.
                        </p>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-3">Política de privacidad</h2>
                <p className="text-sm text-slate-600">
                    Podés consultar nuestra{' '}
                    <a href="/privacidad" className="text-emerald-600 hover:underline font-semibold">
                        Política de Privacidad
                    </a>{' '}
                    para conocer cómo gestionamos tu información.
                </p>
            </section>
        </main>
    );
}
