import { useEffect, useState, useCallback } from "react";
import type { BoardType } from "./blocks";
function generateId() {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}
export interface WorkspaceBlock {
  uid: string;
  blockId: string;
  category: string;
  label: string;
  x: number;
  y: number;
}

export interface Project {
  id: string;
  name: string;
  board: BoardType;
  createdAt: number;
  updatedAt: number;
  blocks: WorkspaceBlock[];
  xml?: string;
}

const KEY = "RoboticsOnPhone.projects.v1";

function read(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(projects: Project[]) {
  localStorage.setItem(KEY, JSON.stringify(projects));
  window.dispatchEvent(new Event("RoboticsOnPhone:projects"));
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const sync = () => setProjects(read());
    sync();
    window.addEventListener("RoboticsOnPhone:projects", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("RoboticsOnPhone:projects", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const create = useCallback((name: string, board: BoardType): Project => {
    const p: Project = {
      id: generateId(),
      name,
      board,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      blocks: [],
    };
    write([...read(), p]);
    return p;
  }, []);

  const update = useCallback((id: string, patch: Partial<Project>) => {
    write(
      read().map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((p) => p.id !== id));
  }, []);

  const duplicate = useCallback((id: string) => {
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
  }, []);

  return { projects, create, update, remove, duplicate };
}

export function getProject(id: string): Project | undefined {
  return read().find((p) => p.id === id);
}
