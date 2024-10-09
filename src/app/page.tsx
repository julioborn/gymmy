// src/app/page.tsx
import React from 'react';

export default function HomePage() {
  return (
    <div className="text-center py-2">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">
        Bienvenido al Sistema del Gimnasio
      </h1>
      <p className="text-xl text-white">
        Administra los alumnos, su asistencia y su información personal.
      </p>
    </div>
  );
}
