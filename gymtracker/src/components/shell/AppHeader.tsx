import { Dumbbell } from "lucide-react";
import ProfileMenu from "../auth/ProfileMenu";
import SyncBadge from "./SyncBadge";

/**
 * Shared top header — rendered above every tab in the app shell.
 */
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px]">
            <div className="w-full h-full bg-background rounded-[11px] flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary transform -rotate-45" />
            </div>
          </div>
          <div>
            <h1
              id="app-title"
              className="text-xl font-heading font-extrabold tracking-tight text-foreground leading-none"
            >
              GymTracker
            </h1>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mt-1">
              Registro Allenamenti
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SyncBadge />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
