import { useState } from "react";
import AppHeader from "./AppHeader";
import BottomNav, { type Tab } from "./BottomNav";
import HomeView from "../dashboard/HomeView";
import StoricoView from "../dashboard/StoricoView";
import StatisticheView from "../dashboard/StatisticheView";

/**
 * App shell shown whenever no workout session is active: shared header,
 * the active tab's content, and the fixed bottom nav.
 */
export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none antialiased">
      <AppHeader />

      {activeTab === "home" && <HomeView />}
      {activeTab === "storico" && <StoricoView />}
      {activeTab === "statistiche" && <StatisticheView />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
