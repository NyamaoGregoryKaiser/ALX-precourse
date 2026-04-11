```tsx
import React from 'react';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white p-6 mt-8 shadow-inner">
      <div className="container mx-auto text-center">
        <div className="flex justify-center space-x-6 mb-4">
          <a href="https://github.com/your-github" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
            <FaGithub size={24} />
          </a>
          <a href="https://linkedin.com/in/your-linkedin" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
            <FaLinkedin size={24} />
          </a>
          <a href="https://twitter.com/your-twitter" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
            <FaTwitter size={24} />
          </a>
        </div>
        <p className="text-gray-400 text-sm mb-2">
          &copy; {new Date().getFullYear()} ALX E-commerce Pro. All rights reserved.
        </p>
        <p className="text-gray-500 text-xs">
          Built with passion for ALX Software Engineering.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
```