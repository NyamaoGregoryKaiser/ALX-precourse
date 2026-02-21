import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ isOpen, onClose, title, children, onSubmit, submitText = 'Confirm', isLoading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative p-6 bg-white w-full max-w-md mx-auto rounded-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="text-gray-700 mb-6">
          {children}
        </div>
        {onSubmit && (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : submitText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;