import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import theme from './styles/theme.ts';
import { AuthProvider } from './context/AuthContext.tsx';

/**
 * Main entry point for the React frontend application.
 *
 * It wraps the entire application with necessary providers:
 * - `React.StrictMode`: For highlighting potential problems in an application.
 * - `BrowserRouter`: For client-side routing.
 * - `ChakraProvider`: For providing Chakra UI styling and theming.
 * - `AuthProvider`: For managing global authentication state.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>,
);