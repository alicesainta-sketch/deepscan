"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { useHydrated } from "@/lib/useHydrated";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "deepscan:sidebar-collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isHydrated = useHydrated();
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = useMemo(() => {
    if (collapsedOverride !== null) return collapsedOverride;
    if (!isHydrated || typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  }, [collapsedOverride, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed, isHydrated]);

  return (
    <div className="mx-auto flex h-screen w-full flex-col bg-[#faf9f5] md:flex-row dark:bg-slate-900">
      <aside
        className={`h-56 w-full border-b border-slate-200/80 md:h-screen md:shrink-0 md:border-b-0 md:border-r md:border-slate-200/80 md:transition-[width] md:duration-200 dark:border-slate-700 ${
          collapsed ? "md:w-[88px]" : "md:w-[300px]"
        }`}
      >
        <Navbar
          collapsed={collapsed}
          onToggleCollapse={() =>
            setCollapsedOverride((prev) => {
              const current = prev ?? collapsed;
              return !current;
            })
          }
        />
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
