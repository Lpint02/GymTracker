import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkoutProvider } from './context/WorkoutContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkoutProvider>
      <App />
    </WorkoutProvider>
  </StrictMode>,
);