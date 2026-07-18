import type { BoardType } from "./board";

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
