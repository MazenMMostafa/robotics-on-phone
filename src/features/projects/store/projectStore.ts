import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "../../../core/types/project";
import type { BoardType } from "../../../core/types/board";
import { generateId } from "../../../core/utils/id";

const STORAGE_KEY = "NewBeginMakes.projects.v2";
const CUSTOM_EVENT = "NewBeginMakes:projects";

interface ProjectStore {
  projects: Project[];
  selectedId: string | null;
  create: (name: string, board: BoardType) => Project;
  createProject: (name: string, board: BoardType) => Project;
  update: (id: string, patch: Partial<Project>) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  remove: (id: string) => void;
  removeProject: (id: string) => void;
  duplicate: (id: string) => void;
  duplicateProject: (id: string) => void;
  select: (id: string | null) => void;
  subscribe: (cb: () => void) => () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedId: null,

      create: (name, board) => {
        const project: Project = {
          id: generateId(),
          name,
          board,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          blocks: [],
        };
        set((s) => ({ projects: [...s.projects, project] }));
        window.dispatchEvent(new Event(CUSTOM_EVENT));
        return project;
      },
      createProject: (name, board) => get().create(name, board),

      update: (id, patch) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        }));
        window.dispatchEvent(new Event(CUSTOM_EVENT));
      },
      updateProject: (id, patch) => get().update(id, patch),

      remove: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }));
        window.dispatchEvent(new Event(CUSTOM_EVENT));
      },
      removeProject: (id) => get().remove(id),

      duplicate: (id) => {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return;
        const project: Project = {
          ...src,
          id: generateId(),
          name: src.name + " copy",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ projects: [...s.projects, project] }));
        window.dispatchEvent(new Event(CUSTOM_EVENT));
      },
      duplicateProject: (id) => get().duplicate(id),

      select: (id) => set({ selectedId: id }),

      subscribe: (cb) => {
        const handler = () => cb();
        window.addEventListener(CUSTOM_EVENT, handler);
        window.addEventListener("storage", handler);
        return () => {
          window.removeEventListener(CUSTOM_EVENT, handler);
          window.removeEventListener("storage", handler);
        };
      },
    }),
    { name: STORAGE_KEY },
  ),
);
