import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Add any custom props if needed
}

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className || ''}`}
      {...props}
    />
  );
};

export default Input;