import React from 'react';
import Modal from 'react-modal';

type ModalWrapperProps = {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
};

const ModalWrapper: React.FC<ModalWrapperProps> = ({ isOpen, onClose, children }) => (
    <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        className="bg-white p-8 rounded shadow-md max-w-lg mx-auto w-[800px]"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
        {children}
    </Modal>
);

export default ModalWrapper;
