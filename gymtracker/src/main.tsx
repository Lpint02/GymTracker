import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import AuthGate from './components/auth/AuthGate';
import ScopedWorkoutProvider from './components/auth/ScopedWorkoutProvider';
import UpdatePrompt from './components/shell/UpdatePrompt';
import { requestPersistentStorage } from './lib/db';
import App from './App.tsx';
import './index.css';

// Fire-and-forget, outside React: it is a one-off browser negotiation, not
// application state, and a refusal changes nothing about how the app runs.
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* AuthProvider sits outside the workout tree: hydration needs a user id
        before it reads anything, and the sync engine will need the token. */}
    <AuthProvider>
      <AuthGate>
        <ScopedWorkoutProvider>
          <App />
        </ScopedWorkoutProvider>
      </AuthGate>
    </AuthProvider>
    {/* Outside the gate: a pending update is worth offering whether the user
        is signed in, on the login screen, or mid-workout. */}
    <UpdatePrompt />
  </StrictMode>,
);
