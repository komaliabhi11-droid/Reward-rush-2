import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { UnityAdsProvider } from './components/UnityAdsProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UnityAdsProvider>
      <App />
    </UnityAdsProvider>
  </StrictMode>,
);
