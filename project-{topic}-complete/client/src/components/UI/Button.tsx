import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  secondary?: boolean;
  danger?: boolean;
  fullWidth?: boolean;
  small?: boolean;
  large?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  primary,
  secondary,
  danger,
  fullWidth,
  small,
  large,
  children,
  className,
  ...props
}) => {
  let baseStyles =
    'font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out';

  if (primary) {
    baseStyles += ' bg-blue-600 hover:bg-blue-700 text-white';
  } else if (secondary) {
    baseStyles += ' bg-gray-200 hover:bg-gray-300 text-gray-800';
  } else if (danger) {
    baseStyles += ' bg-red-600 hover:bg-red-700 text-white';
  } else {
    // Default style if none specified
    baseStyles += ' bg-blue-500 hover:bg-blue-600 text-white';
  }

  if (fullWidth) {
    baseStyles += ' w-full';
  }

  if (small) {
    baseStyles = baseStyles.replace('py-2 px-4', 'py-1 px-3 text-sm');
  } else if (large) {
    baseStyles = baseStyles.replace('py-2 px-4', 'py-3 px-6 text-lg');
  }

  return (
    <button className={`${baseStyles} ${className || ''}`} {...props}>
      {children}
    </button>
  );
};

export default Button;