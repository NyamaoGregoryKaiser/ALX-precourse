```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Ensure this points to your TailwindCSS output
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
```