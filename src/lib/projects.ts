export {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  removeProject,
  duplicateProject,
  subscribeToProjects,
} from "../core/services/project/ProjectRepository";

export type { Project, WorkspaceBlock } from "../core/types/project";
export { useProjects } from "../features/projects/store/projectStoreFallback";
