import type { Project } from "../../types/project";
import type { BoardType } from "../../types/board";
import { generateId } from "../../utils/id";

const STORAGE_KEY = "NewBeginMakes.projects.v1";
const CUSTOM_EVENT = "NewBeginMakes:projects";

function read(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function write(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  window.dispatchEvent(new Event(CUSTOM_EVENT));
}

export function getAllProjects(): Project[] {
  return read();
}

export function getProject(id: string): Project | undefined {
  return read().find((p) => p.id === id);
}

export function createProject(name: string, board: BoardType): Project {
  const project: Project = {
    id: generateId(),
    name,
    board,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    blocks: [],
  };
  write([...read(), project]);
  return project;
}

export function updateProject(id: string, patch: Partial<Project>) {
  write(
    read().map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
    ),
  );
}

export function removeProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function duplicateProject(id: string) {
  const all = read();
  const src = all.find((p) => p.id === id);
  if (!src) return;
  write([
    ...all,
    {
      ...src,
      id: generateId(),
      name: src.name + " copy",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);
}

export function subscribeToProjects(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(CUSTOM_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CUSTOM_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
