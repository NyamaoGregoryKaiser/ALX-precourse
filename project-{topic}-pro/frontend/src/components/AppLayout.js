import React from 'react';
import Navbar from './Navbar';

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-800 text-white p-4 text-center mt-auto">
        &copy; {new Date().getFullYear()} ML-Utilities-Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default AppLayout;