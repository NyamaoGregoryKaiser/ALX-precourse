```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Basic global styles if any
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
```