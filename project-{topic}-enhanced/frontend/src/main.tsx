```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css'; // Global CSS or Tailwind CSS import
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // For data fetching/caching

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </React.StrictMode>,
);
```