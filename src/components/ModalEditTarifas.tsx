import { useState } from 'react';
import Modal from 'react-modal';

type Tarifa = {
    dias: number;
    valor: number;
};

type ModalEditTarifasProps = {
    tarifas: Tarifa[];
    onClose: () => void;
    onSave: (updatedTarifas: Tarifa[]) => void;
};

export default function ModalEditTarifas({
    tarifas,
    onClose,
    onSave,
}: ModalEditTarifasProps) {
    const [tarifasState, setTarifasState] = useState(tarifas);

    const handleInputChange = (index: number, value: number) => {
        setTarifasState((prev) =>
            prev.map((tarifa, i) =>
                i === index ? { ...tarifa, valor: value } : tarifa
            )
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(tarifasState);
    };

    return (
        <Modal
            isOpen
            onRequestClose={onClose}
            className="bg-white p-8 rounded shadow-md max-w-lg mx-auto w-[600px]"
            overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Editar Tarifas</h2>
            <form onSubmit={handleSubmit}>
                {tarifasState.map((tarifa, index) => (
                    <div key={tarifa.dias} className="mb-4">
                        <label className="block text-gray-700">
                            Días {tarifa.dias}:
                        </label>
                        <input
                            type="number"
                            value={tarifa.valor}
                            onChange={(e) =>
                                handleInputChange(index, Number(e.target.value))
                            }
                            className="border border-gray-300 p-2 w-full rounded"
                        />
                    </div>
                ))}
                <div className="flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                        Guardar
                    </button>
                </div>
            </form>
        </Modal>
    );
}
