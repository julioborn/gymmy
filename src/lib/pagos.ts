export type PagoLike = {
    mes?: string;
    esEspecial?: boolean;
    fechaDesde?: string | Date | null;
    fechaHasta?: string | Date | null;
    [key: string]: any;
};

/**
 * Nombre del mes en español para la fecha dada. OJO con la zona horaria del caller:
 * en el cliente (navegador, ya en hora Argentina) pasar `new Date()` tal cual; en
 * el server (Vercel corre en UTC) pasar una fecha ya desplazada -3h, ej.
 * `new Date(Date.now() - 3 * 60 * 60 * 1000)`.
 */
export function getMesActual(fecha: Date): string {
    return fecha.toLocaleString('es-ES', { month: 'long' }).toLowerCase();
}

/**
 * Busca el pago vigente para el mes dado. Los pagos especiales (esEspecial)
 * se guardan con mes "especial-<mes>" y opcionalmente un rango fechaDesde/fechaHasta;
 * un match simple por string contra el mes actual los pasa por alto.
 */
export function pagoVigente(pagos: PagoLike[] | undefined, mesActual: string, fechaRef: Date = new Date()): PagoLike | null {
    for (const p of (pagos ?? [])) {
        if (p.esEspecial) {
            if (p.fechaDesde && p.fechaHasta) {
                const desde = new Date(p.fechaDesde);
                const hasta = new Date(p.fechaHasta);
                if (fechaRef >= desde && fechaRef <= hasta) return p;
                continue;
            }
            if (p.mes?.toLowerCase().replace(/^especial-/, '') === mesActual) return p;
            continue;
        }
        if (p.mes?.toLowerCase() === mesActual) return p;
    }
    return null;
}

/**
 * Igual que pagoVigente pero devuelve TODOS los pagos vigentes del mes, no solo
 * el primero. Útil cuando alguien pagó en más de un pago especial (ej. parte en
 * efectivo y parte por transferencia) y hay que mostrar el conjunto completo.
 */
export function pagosVigentesDelMes(pagos: PagoLike[] | undefined, mesActual: string, fechaRef: Date = new Date()): PagoLike[] {
    return (pagos ?? []).filter(p => {
        if (p.esEspecial) {
            if (p.fechaDesde && p.fechaHasta) {
                const desde = new Date(p.fechaDesde);
                const hasta = new Date(p.fechaHasta);
                return fechaRef >= desde && fechaRef <= hasta;
            }
            return p.mes?.toLowerCase().replace(/^especial-/, '') === mesActual;
        }
        return p.mes?.toLowerCase() === mesActual;
    });
}

/**
 * ¿El alumno está al día este mes? Respeta exentoCuota (ej. profes que solo
 * registran asistencia) y reconoce pagos especiales correctamente.
 */
export function estaAlDia(
    alumno: { exentoCuota?: boolean; pagos?: PagoLike[] },
    mesActual: string,
    fechaRef: Date = new Date(),
): boolean {
    if (alumno.exentoCuota) return true;
    return pagoVigente(alumno.pagos, mesActual, fechaRef) !== null;
}
