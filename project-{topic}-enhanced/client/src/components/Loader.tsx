import React from 'react';
import { ClipLoader } from 'react-spinners';

const Loader: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
      <ClipLoader color="#4A90E2" loading={true} size={50} />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Loader;