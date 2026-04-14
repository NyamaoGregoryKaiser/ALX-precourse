import React from 'react';
import ReactDOM from 'react-dom';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <Button onClick={onClose} secondary small aria-label="Close modal">
            &times;
          </Button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;