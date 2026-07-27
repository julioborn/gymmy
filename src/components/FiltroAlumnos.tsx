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

            {/* Chips de filtros */}
            <div className="flex flex-wrap gap-2 items-center">

                {/* Pago */}
                {[
                    { value: '', label: 'Todos' },
                    { value: 'pagado', label: 'Pagaron' },
                    { value: 'no-pagado', label: 'Deben' },
                ].map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setFiltroPago(value)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filtroPago === value
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {label}
                    </button>
                ))}

                <span className="w-px h-5 bg-slate-200 mx-0.5" />

                {/* Orden plan */}
                {[
                    { value: '', label: 'Plan ↕' },
                    { value: 'asc', label: 'Plan ↑' },
                    { value: 'desc', label: 'Plan ↓' },
                ].map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setOrdenDiasRestantes(value)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${ordenDiasRestantes === value
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {label}
                    </button>
                ))}

                {/* Días por semana */}
                {diasDisponibles.length > 0 && (
                    <>
                        <span className="w-px h-5 bg-slate-200 mx-0.5" />
                        <button
                            onClick={() => setFiltroDiasEntrena('')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filtroDiasEntrena === ''
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            Sem ↕
                        </button>
                        {diasDisponibles.map((d) => (
                            <button
                                key={d}
                                onClick={() => setFiltroDiasEntrena(String(d))}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filtroDiasEntrena === String(d)
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                {d}d/sem
                            </button>
                        ))}
                    </>
                )}

                {/* Limpiar */}
                {hayFiltros && (
                    <button
                        onClick={limpiarFiltros}
                        className="ml-auto px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    >
                        Limpiar
                    </button>
                )}
            </div>

        </div>
    );
}
