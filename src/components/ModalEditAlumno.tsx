import { useState } from 'react';
import Modal from 'react-modal';

type ModalEditAlumnoProps = {
    alumno: any;
    onClose: () => void;
    onSave: (id: string, updatedAlumno: any) => void;
};

export default function ModalEditAlumno({
    alumno,
    onClose,
    onSave,
}: ModalEditAlumnoProps) {
    const [formData, setFormData] = useState(alumno);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Opcional: Validación adicional si necesitas verificar algo antes de guardar
        const updatedAlumno = {
            ...formData,
            telefono: formData.telefono.trim() === '' ? null : formData.telefono,
            email: formData.email.trim() === '' ? null : formData.email,
        };

        onSave(alumno._id, updatedAlumno);
    };

    return (
        <Modal
            isOpen={Boolean(alumno)}
            onRequestClose={onClose}
            className="bg-white p-8 rounded shadow-md max-w-lg mx-auto w-[800px]"
            overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Editar Alumno</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700">Nombre</label>
                    <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700">Apellido</label>
                    <input
                        type="text"
                        value={formData.apellido}
                        onChange={(e) => handleInputChange('apellido', e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700">DNI</label>
                    <input
                        type="text"
                        value={formData.dni}
                        onChange={(e) => handleInputChange('dni', e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700">Teléfono</label>
                    <input
                        type="text"
                        value={formData.telefono || ''}
                        onChange={(e) => handleInputChange('telefono', e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700">Email</label>
                    <input
                        type="text"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                    />
                </div>
                <div className="flex justify-center space-x-2">
                    <button
                        type="submit"
                        className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                        Guardar
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
}
