import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface UiStore {
  activePage: string;
  sidebarOpen: boolean;
  toasts: Toast[];
  setActivePage: (page: string) => void;
  setSidebarOpen: (v: boolean) => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiStore>((set) => ({
  activePage: "home",
  sidebarOpen: false,
  toasts: [],

  setActivePage: (activePage) => set({ activePage }),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
