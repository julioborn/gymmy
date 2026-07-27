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

const Chevron = () => (
    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

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
    const hayFiltros = busqueda || filtroPago || ordenDiasRestantes || filtroDiasEntrena;

    return (
        <div className="space-y-3 mb-2">

            {/* Búsqueda */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar por nombre o documento..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white transition-colors"
                />
                {busqueda && (
                    <button
                        onClick={() => setBusqueda('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Selects */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <select
                        value={filtroPago}
                        onChange={(e) => setFiltroPago(e.target.value)}
                        className="w-full appearance-none bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                    >
                        <option value="">Pago</option>
                        <option value="pagado">Pagaron</option>
                        <option value="no-pagado">Deben</option>
                    </select>
                    <Chevron />
                </div>

                <div className="relative flex-1">
                    <select
                        value={ordenDiasRestantes}
                        onChange={(e) => setOrdenDiasRestantes(e.target.value)}
                        className="w-full appearance-none bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                    >
                        <option value="">Plan</option>
                        <option value="asc">Plan ↑</option>
                        <option value="desc">Plan ↓</option>
                    </select>
                    <Chevron />
                </div>

                {diasDisponibles.length > 0 && (
                    <div className="relative flex-1">
                        <select
                            value={filtroDiasEntrena}
                            onChange={(e) => setFiltroDiasEntrena(e.target.value)}
                            className="w-full appearance-none bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                        >
                            <option value="">Días/sem</option>
                            {diasDisponibles.map((d) => (
                                <option key={d} value={d}>{d} días</option>
                            ))}
                        </select>
                        <Chevron />
                    </div>
                )}

                {hayFiltros && (
                    <button
                        onClick={limpiarFiltros}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap px-1"
                    >
                        Limpiar
                    </button>
                )}
            </div>

        </div>
    );
}
