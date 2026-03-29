import React from 'react';

interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, type = 'info', onClose }) => {
  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info':
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  return (
    <div className={`${getColors()} border px-4 py-3 rounded relative my-4`} role="alert">
      <span className="block sm:inline">{message}</span>
      {onClose && (
        <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={onClose}>
          <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <title>Close</title>
            <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
          </svg>
        </span>
      )}
    </div>
  );
};

export default Alert;