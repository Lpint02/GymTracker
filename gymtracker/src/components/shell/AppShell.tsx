import { useState } from "react";
import AppHeader from "./AppHeader";
import AppSkeleton from "./AppSkeleton";
import BottomNav, { type Tab } from "./BottomNav";
import HomeView from "../dashboard/HomeView";
import StoricoView from "../dashboard/StoricoView";
import StatisticheView from "../dashboard/StatisticheView";
import { useHistory } from "../../context/WorkoutContext";

/**
 * App shell shown whenever no workout session is active: shared header,
 * the active tab's content, and the fixed bottom nav.
 */
export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const { isLoading } = useHistory();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none antialiased">
      <AppHeader />

      {isLoading && <AppSkeleton />}

      {!isLoading && activeTab === "home" && <HomeView />}
      {!isLoading && activeTab === "storico" && <StoricoView />}
      {!isLoading && activeTab === "statistiche" && <StatisticheView />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
