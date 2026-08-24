import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkoutProvider } from './context/WorkoutContext';
import { requestPersistentStorage } from './lib/db';
import App from './App.tsx';
import './index.css';

// Fire-and-forget, outside React: it is a one-off browser negotiation, not
// application state, and a refusal changes nothing about how the app runs.
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkoutProvider>
      <App />
    </WorkoutProvider>
  </StrictMode>,
);