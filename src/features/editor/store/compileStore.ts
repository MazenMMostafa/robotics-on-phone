import { create } from "zustand";
import { compileArduinoCode } from "../../../core/services/compiler/CompileClient";

type CompileStatus = "idle" | "compiling" | "done" | "fail";

interface CompileStore {
  status: CompileStatus;
  hex: string;
  error: string | null;
  compile: (code: string, board: string, serverUrl?: string) => Promise<void>;
  reset: () => void;
}

export const useCompileStore = create<CompileStore>((set) => ({
  status: "idle",
  hex: "",
  error: null,

  compile: async (code, board, serverUrl) => {
    set({ status: "compiling", hex: "", error: null });
    try {
      const hex = await compileArduinoCode({ code, board, serverUrl });
      set({ status: "done", hex });
    } catch (e) {
      set({ status: "fail", error: e instanceof Error ? e.message : String(e) });
    }
  },

  reset: () => set({ status: "idle", hex: "", error: null }),
}));
