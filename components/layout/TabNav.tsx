"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, ArrowLeftRight, ArrowDownToLine, Clock } from "lucide-react";
import { TabId } from "@/types";
import { cn } from "@/lib/utils";

interface TabNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const TABS = [
  { id: "portfolio" as TabId, label: "Portfolio", Icon: BarChart3 },
  { id: "earn" as TabId, label: "Earn", Icon: TrendingUp },
  { id: "trade" as TabId, label: "Trade", Icon: ArrowLeftRight },
  { id: "deposit" as TabId, label: "Bridge", Icon: ArrowDownToLine },
  { id: "activity" as TabId, label: "Activity", Icon: Clock },
];

export function TabNav({ activeTab, onChange }: TabNavProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-zap-surface border border-zap-border rounded-2xl">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-display font-semibold transition-colors duration-200",
            activeTab === id ? "text-zap-bg" : "text-zap-subtext hover:text-zap-text"
          )}
        >
          {activeTab === id && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 bg-zap-accent rounded-xl shadow-glow-accent"
              transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
            />
          )}
          <Icon className="relative w-3.5 h-3.5" />
          <span className="relative hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}