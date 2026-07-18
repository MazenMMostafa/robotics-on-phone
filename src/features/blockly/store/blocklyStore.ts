import { create } from "zustand";

interface BlocklyStore {
  workspace: unknown | null;
  loading: boolean;
  error: string | null;
  init: (workspace: unknown) => void;
  dispose: () => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useBlocklyStore = create<BlocklyStore>((set) => ({
  workspace: null,
  loading: true,
  error: null,

  init: (workspace) => set({ workspace, loading: false, error: null }),

  dispose: () => set({ workspace: null }),

  setLoading: (v) => set({ loading: v }),

  setError: (e) => set({ error: e, loading: false }),
}));
