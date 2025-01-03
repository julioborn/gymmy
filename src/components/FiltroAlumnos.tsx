type FiltrosProps = {
    busqueda: string;
    setBusqueda: (value: string) => void;
    filtroEdad: string;
    setFiltroEdad: (value: string) => void;
    filtroPago: string;
    setFiltroPago: (value: string) => void;
    ordenDiasRestantes: string;
    setOrdenDiasRestantes: (value: string) => void;
    edades: number[]; // Las edades disponibles para filtrar
    limpiarFiltros: () => void;
};

export default function FiltrosAlumnos({
    busqueda,
    setBusqueda,
    filtroEdad,
    setFiltroEdad,
    filtroPago,
    setFiltroPago,
    ordenDiasRestantes,
    setOrdenDiasRestantes,
    edades,
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
                    value={filtroEdad}
                    onChange={(e) => setFiltroEdad(e.target.value)}
                    className="border border-gray-300 p-2 rounded bg-gray-200 w-full cursor-pointer"
                >
                    <option value="">Edad</option>
                    {edades.map((edad) => (
                        <option key={edad} value={edad}>{edad}</option>
                    ))}
                </select>

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
            </div>

            <div className="flex justify-between items-center mb-10 mt-4">
                <button
                    onClick={limpiarFiltros}
                    className="bg-gray-700 text-white px-4 py-2 text-sm rounded hover:bg-gray-800"
                >
                    Limpiar Filtros
                </button>
            </div>
        </div>
    );
}
