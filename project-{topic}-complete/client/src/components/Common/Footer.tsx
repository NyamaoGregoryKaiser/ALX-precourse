import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white p-4 text-center mt-auto">
      <div className="container mx-auto">
        <p>&copy; {new Date().getFullYear()} TaskFlow. All rights reserved.</p>
        <p className="text-sm mt-1">Built with ❤️ for ALX Software Engineering</p>
      </div>
    </footer>
  );
};

export default Footer;