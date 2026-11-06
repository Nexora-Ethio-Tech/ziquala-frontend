import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppearanceProvider } from './context/AppearanceContext';
import './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <ThemeProvider>
      <UserProvider>
        <AppearanceProvider>
          <App />
        </AppearanceProvider>
      </UserProvider>
    </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
