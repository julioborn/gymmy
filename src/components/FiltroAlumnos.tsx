type FiltrosProps = {
    busqueda: string;
    setBusqueda: (value: string) => void;
    filtroPago: string;
    setFiltroPago: (value: string) => void;
    ordenDiasRestantes: string;
    setOrdenDiasRestantes: (value: string) => void;
    filtroDiasEntrena: string;
    setFiltroDiasEntrena: (value: string) => void;
    diasDisponibles: number[];
    limpiarFiltros: () => void;
};

export default function FiltrosAlumnos({
    busqueda,
    setBusqueda,
    filtroPago,
    setFiltroPago,
    ordenDiasRestantes,
    setOrdenDiasRestantes,
    filtroDiasEntrena,
    setFiltroDiasEntrena,
    diasDisponibles,
    limpiarFiltros,
}: FiltrosProps) {
    return (
        <div className="mb-4">
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre o documento"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="border border-gray-300 p-2 w-full mb-2 rounded"
                />
            </div>

            <div className="space-y-2 lg:space-x-2 lg:space-y-0 flex flex-col lg:flex-row">

                <select
                    value={filtroPago}
                    onChange={(e) => setFiltroPago(e.target.value)}
                    className="border border-gray-300 p-2 rounded bg-gray-200 w-full cursor-pointer"
                >
                    <option value="">Pago</option>
                    <option value="pagado">Pagaron</option>
                    <option value="no-pagado">No pagaron</option>
                </select>

                <select
                    value={ordenDiasRestantes}
                    onChange={(e) => setOrdenDiasRestantes(e.target.value)}
                    className="border border-gray-300 p-2 rounded bg-gray-200 w-full cursor-pointer"
                >
                    <option value="">Días Restantes Plan</option>
                    <option value="asc">Días Restantes (Ascendente)</option>
                    <option value="desc">Días Restantes (Descendente)</option>
                </select>
                <select
                    value={filtroDiasEntrena}
                    onChange={(e) => setFiltroDiasEntrena(e.target.value)}
                    className="border border-gray-300 p-2 rounded bg-gray-200 w-full cursor-pointer"
                >
                    <option value="">Días Por Semana</option>
                    {diasDisponibles.map((d) => (
                        <option key={d} value={d}>
                            {d} días
                        </option>
                    ))}
                </select>

            </div>

            <div className="flex justify-end items-center mb-10 mt-4">
                <button
                    onClick={limpiarFiltros}
                    className="bg-gray-700 text-white px-4 py-2 text-sm rounded hover:bg-gray-800"
                >
                    Limpiar filtros
                </button>
            </div>
        </div>
    );
}
