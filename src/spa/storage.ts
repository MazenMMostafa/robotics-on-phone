export type BoardType = "Arduino Uno" | "Arduino Nano" | "ESP32";

export type Project = {
  id: string;
  name: string;
  board: BoardType;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "RoboticsOnPhone_projects";

export function generateId() {
  return `project_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function readProjects(): Project[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data.filter((item): item is Project => {
      return (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item &&
        "board" in item &&
        "createdAt" in item &&
        "updatedAt" in item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.board === "string" &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProject(id: string) {
  return readProjects().find((project) => project.id === id);
}

export function createProject(name: string, board: BoardType) {
  const now = new Date().toISOString();

  const project: Project = {
    id: generateId(),
    name,
    board,
    createdAt: now,
    updatedAt: now,
  };

  const projects = readProjects();
  saveProjects([project, ...projects]);

  return project;
}

export function deleteProject(id: string) {
  const projects = readProjects().filter((project) => project.id !== id);
  saveProjects(projects);
}
