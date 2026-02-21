"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "deepscan:sidebar-collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="mx-auto flex h-screen w-full flex-col md:flex-row">
      <aside
        className={`h-60 w-full md:h-screen md:shrink-0 md:transition-[width] md:duration-200 ${
          collapsed ? "md:w-[92px]" : "md:w-[320px]"
        }`}
      >
        <Navbar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
      </aside>
      <main className="flex-1 overflow-auto bg-white dark:bg-slate-900">{children}</main>
    </div>
  );
}
