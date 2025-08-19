import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DataStoreProvider } from './lib/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataStoreProvider>
      <App />
    </DataStoreProvider>
  </StrictMode>
);
