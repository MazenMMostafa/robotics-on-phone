import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  resolved: () => "light" | "dark";
}

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: "system",

      setMode: (mode) => set({ mode }),

      toggle: () => {
        const next = get().resolved() === "dark" ? "light" : "dark";
        set({ mode: next });
      },

      resolved: () => resolve(get().mode),
    }),
    { name: "NewBeginMakes.theme.v1" },
  ),
);
