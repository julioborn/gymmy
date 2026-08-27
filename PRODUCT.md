# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Dueños y profesores de gimnasio** — gestionan alumnos, registran asistencias, cargan pagos y asignan planes de entrenamiento personalizados con progresión semanal.

**Alumnos** — acceden desde el celular a su historial de asistencias, pagos y su plan de entrenamiento activo, donde registran sus pesos y observaciones por ejercicio.

**Superadmin** — administra los gimnasios registrados en la plataforma.

## Product Purpose

Gymmy es una app de gestión integral para gimnasios: reemplaza planillas dispersas y herramientas separadas con un solo lugar para manejar asistencias, pagos y planes de entrenamiento. El alumno también tiene su propio acceso para seguir su progreso.

## Positioning

Integra asistencia, pagos y entrenamiento personalizado con progresión semanal en una sola app — sin necesidad de combinar varias herramientas. Cualquier gimnasio puede registrarse y usarla como SaaS.

## Operating Context

- El staff opera principalmente desde desktop o tablet en el gimnasio.
- Los alumnos acceden mayormente desde el celular, antes o después de entrenar.
- El plan de entrenamiento muestra la semana actual calculada automáticamente desde la fecha de inicio.
- Sporttime es el primer gimnasio cliente; la arquitectura multi-tenant soporta más.

## Capabilities and Constraints

- Multi-tenant: cada gimnasio tiene sus propios alumnos, pagos y planes aislados.
- Autenticación: NextAuth con JWT; roles diferenciados (superadmin, staff del gym, alumno).
- Planes de entrenamiento: plantillas creadas por el profe, asignadas al alumno con pesos de referencia; el alumno registra sus propios pesos y observaciones.
- Stack: Next.js 14 App Router, MongoDB (Atlas), Mongoose, Tailwind CSS (tema slate/emerald).
- Despliegue: Vercel (producción).

## Brand Commitments

- Nombre: **Gymmy**
- Paleta: slate oscuro + emerald como color de acción principal.
- Tono: directo, funcional, sin adornos innecesarios.

## Evidence on Hand

- Codebase completo en producción con un gimnasio real activo (Sporttime).
- Plan de entrenamiento real cargado (Meso 7 de Julio Born, 5 semanas × 3 días).

## Product Principles

1. **Todo en un lugar** — asistencia, pagos y entrenamiento sin saltar entre herramientas.
2. **Simple para el alumno** — la vista móvil debe ser inmediata y sin fricción.
3. **El profe manda** — el staff tiene control total; el alumno solo edita lo que le corresponde.
4. **Multi-tenant desde el día uno** — cada gym es un mundo aislado dentro de la misma plataforma.

## Accessibility & Inclusion

Uso primario en móvil para alumnos; las vistas de alumno deben ser completamente funcionales en pantallas pequeñas con touch.
