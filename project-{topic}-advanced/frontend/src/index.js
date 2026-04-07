import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Removed default index.css for inline styles in public/index.html
// import './index.css'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);