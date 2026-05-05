import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handlers for Gemini Agent visibility via Logcat
window.addEventListener('error', (event) => {
  console.error(`!![UNHANDLED WEB ERROR]!! ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
  if (event.error?.stack) {
    console.error(`Stacktrace:\n${event.error.stack}`);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error(`!![UNHANDLED PROMISE REJECTION]!! Reason: ${event.reason}`);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
