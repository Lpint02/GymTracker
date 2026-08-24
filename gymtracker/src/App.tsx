import { useSession } from "./context/WorkoutContext";
import AppShell from "./components/shell/AppShell";
import WorkoutSessionView from "./components/session/WorkoutSessionView";

/**
 * Root application component.
 * Acts as a simple router: renders the active session view or the app shell.
 */
export default function App() {
  const { session } = useSession();

  if (session) {
    return <WorkoutSessionView />;
  }

  return <AppShell />;
}
