import { useEffect, useCallback } from "react";
import type { BoardType } from "../../../core/types/board";
import type { Project } from "../../../core/types/project";
import { useProjectStore } from "./projectStore";

export function useProjects() {
  const projects = useProjectStore((s) => s.projects);

  useEffect(() => {
    return useProjectStore.getState().subscribe(() => {
      useProjectStore.getState();
    });
  }, []);

  const create = useCallback((name: string, board: BoardType): Project => {
    return useProjectStore.getState().create(name, board);
  }, []);

  const update = useCallback((id: string, patch: Partial<Project>) => {
    useProjectStore.getState().update(id, patch);
  }, []);

  const remove = useCallback((id: string) => {
    useProjectStore.getState().remove(id);
  }, []);

  const duplicate = useCallback((id: string) => {
    useProjectStore.getState().duplicate(id);
  }, []);

  return { projects, create, update, remove, duplicate };
}
