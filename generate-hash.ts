const bcrypt = require('bcryptjs');

async function generateHash() {
    const newPasswordProfesor = 'profe123'; // Nueva contraseña para profesor
    const newPasswordAlumno = 'alumno123'; // Nueva contraseña para alumno

    // Hashear las contraseñas
    const hashedPasswordProfesor = await bcrypt.hash(newPasswordProfesor, 10);
    const hashedPasswordAlumno = await bcrypt.hash(newPasswordAlumno, 10);

    console.log('Hashed password for profesor:', hashedPasswordProfesor);
    console.log('Hashed password for alumno:', hashedPasswordAlumno);
}

generateHash().catch(console.error);
