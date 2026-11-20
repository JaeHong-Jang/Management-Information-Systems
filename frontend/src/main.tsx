import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { LiveProvider } from './shared/api/live';
import { ToastProvider } from './shared/ui';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <LiveProvider>
          <App />
        </LiveProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
