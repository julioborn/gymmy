export default function EliminarCuentaPage() {
    return (
        <main className="max-w-xl mx-auto px-6 py-12 text-slate-700">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Solicitud de eliminación de cuenta</h1>
            <p className="text-sm mb-6">
                Si deseas eliminar tu cuenta y todos tus datos personales de Gymmy, podés hacerlo de las siguientes maneras:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                <h2 className="font-semibold text-slate-800 mb-2">Opción 1 — Contactar al gimnasio</h2>
                <p className="text-sm text-slate-600">
                    Solicitá al administrador de tu gimnasio que elimine tu cuenta directamente desde el panel de gestión.
                </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                <h2 className="font-semibold text-slate-800 mb-2">Opción 2 — Correo electrónico</h2>
                <p className="text-sm text-slate-600">
                    Enviá un email a <strong>gymmy.app.ar@gmail.com</strong> con el asunto <strong>"Eliminar cuenta"</strong> indicando tu nombre y DNI. Procesaremos tu solicitud en un plazo de 7 días hábiles.
                </p>
            </div>

            <p className="text-xs text-slate-400">
                Al eliminar tu cuenta se borrarán permanentemente tus datos personales, historial de asistencias y pagos. Esta acción no puede deshacerse.
            </p>
        </main>
    );
}
