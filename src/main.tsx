import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth';
import { TournamentProvider } from './store';
import './styles.css';

// تسجيل الـ Service Worker (في النسخة المنشورة فقط) ليعمل الموقع بدون نت بعد أول زيارة
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TournamentProvider>
        <App />
      </TournamentProvider>
    </AuthProvider>
  </StrictMode>,
);
