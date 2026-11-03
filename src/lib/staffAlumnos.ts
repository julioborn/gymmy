// DNIs de alumnos que también trabajan en recepción y necesitan, dentro de su
// propia cuenta de alumno, ver la lista de socios, quién vino hoy y registrar
// gente nueva desde el celular.
export const STAFF_ALUMNO_DNIS = ['44810912', '43715735', '43283493'];

export function esStaffAlumno(dni?: string | null): boolean {
    return !!dni && STAFF_ALUMNO_DNIS.includes(dni);
}
