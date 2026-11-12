import { STAFF_ALUMNO_DNIS } from '@/lib/staffAlumnos';

// Timer intermitente en prueba: mientras se valida (sobre todo el servicio en
// segundo plano de Android y la Live Activity de iOS), queda visible para
// todos los roles de staff, pero del lado de alumno solo para este DNI de
// prueba y para los profesores que entran con su cuenta de alumno.
export const TIMER_TESTER_DNI = '43844409';

export function puedeUsarTimerComoAlumno(dni?: string | null): boolean {
    return !!dni && (dni === TIMER_TESTER_DNI || STAFF_ALUMNO_DNIS.includes(dni));
}
