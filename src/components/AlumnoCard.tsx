import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

type AlumnoCardProps = {
    alumno: any;
    onHistorial: (id: string) => void;
    onIniciarPlan: (id: string) => void;
    onMarcarPago: (id: string) => void;
    onEditar: (alumno: any) => void;
    onEliminar: (id: string) => void;
};

export default function AlumnoCard({
    alumno,
    onHistorial,
    onIniciarPlan,
    onMarcarPago,
    onEditar,
    onEliminar,
}: AlumnoCardProps) {
    const verificarPagoMesActual = (pagos: any[]): boolean => {
        const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
        return pagos.some(pago => pago.mes.toLowerCase() === mesActual);
    };

    const obtenerColorSemaforo = (diasRestantes: number | null): string => {
        if (diasRestantes === null) return '';
        if (diasRestantes > 10) return 'text-green-500';
        if (diasRestantes > 5) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="bg-gray-200 border border-gray-400 rounded-lg p-4 shadow-md">
            <h2 className="text-lg font-semibold text-gray-800">{alumno.nombre} {alumno.apellido}</h2>
            <p className="text-gray-600 text-md">Edad: {alumno.edad}</p>
            <p className="text-gray-600 text-md">DNI: {alumno.dni}</p>
            <p className="text-gray-600 text-md">Teléfono: {alumno.telefono}</p>
            <p className="text-gray-600 text-md">Email: {alumno.email}</p>

            <div className="mt-4 flex flex-col justify-center items-start">
                <div>
                    {verificarPagoMesActual(alumno.pagos) ? (
                        <div className="flex items-center space-x-1">
                            <p>Pagó</p>
                            <FaCheckCircle className="text-green-500 flex" title="Pagado" />
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1">
                            <p>No Pagó</p>
                            <FaTimesCircle className="text-red-500" title="No Pagado" />
                        </div>
                    )}
                </div>
                <div className={`font-bold ${obtenerColorSemaforo(alumno.diasRestantes)}`}>
                    {alumno.diasRestantes === 0 ? (
                        <span className="text-red-500">Plan Terminado</span>
                    ) : alumno.diasRestantes !== null ? (
                        `${alumno.diasRestantes} días restantes de plan`
                    ) : (
                        'Sin plan'
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1 justify-center">
                <button
                    onClick={() => onHistorial(alumno._id)}
                    className="bg-gray-700 text-white px-2 py-2 text-sm rounded"
                >
                    Historial
                </button>
                <button
                    onClick={() => onIniciarPlan(alumno._id)}
                    className={`text-white text-sm px-4 py-2 rounded ${
                        alumno.planEntrenamiento?.fechaInicio &&
                        alumno.planEntrenamiento?.duracion &&
                        !alumno.planEntrenamiento?.terminado
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                    disabled={
                        alumno.planEntrenamiento?.fechaInicio &&
                        alumno.planEntrenamiento?.duracion &&
                        !alumno.planEntrenamiento?.terminado
                    }
                >
                    {alumno.planEntrenamiento?.fechaInicio &&
                    alumno.planEntrenamiento?.duracion &&
                    !alumno.planEntrenamiento?.terminado
                        ? 'Plan en curso'
                        : 'Iniciar Plan'}
                </button>
                <button
                    onClick={() => onMarcarPago(alumno._id)}
                    className={`text-white text-sm px-4 py-2 rounded ${
                        verificarPagoMesActual(alumno.pagos) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                    }`}
                    disabled={verificarPagoMesActual(alumno.pagos)}
                >
                    {verificarPagoMesActual(alumno.pagos) ? 'Mes Cobrado' : 'Cobrar Mes'}
                </button>
                <button
                    onClick={() => onEditar(alumno)}
                    className="bg-yellow-500 text-white px-4 py-2 text-sm rounded"
                >
                    Editar
                </button>
                <button
                    onClick={() => onEliminar(alumno._id)}
                    className="bg-red-500 text-white px-4 py-2 text-sm rounded"
                >
                    Eliminar
                </button>
            </div>
        </div>
    );
}
