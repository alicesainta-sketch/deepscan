"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useHydrated } from "@/lib/useHydrated";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  isHydrated: boolean;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "deepscan:theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolveThemeFromClient = (): Theme => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isHydrated = useHydrated();
  const [themeOverride, setThemeOverride] = useState<Theme | null>(null);
  const theme = useMemo<Theme>(() => {
    if (themeOverride) return themeOverride;
    if (!isHydrated || typeof window === "undefined") return "light";
    return resolveThemeFromClient();
  }, [isHydrated, themeOverride]);

  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, isHydrated]);

  const toggleTheme = useCallback(() => {
    setThemeOverride((currentTheme) => {
      const baseTheme =
        currentTheme ??
        (isHydrated && typeof window !== "undefined"
          ? resolveThemeFromClient()
          : "light");
      return baseTheme === "dark" ? "light" : "dark";
    });
  }, [isHydrated]);

  const value = useMemo(
    () => ({
      theme,
      isHydrated,
      toggleTheme,
    }),
    [theme, isHydrated, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
