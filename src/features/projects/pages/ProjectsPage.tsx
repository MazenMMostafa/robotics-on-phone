import { useState, useEffect } from "react";
import type { Page } from "../../../app/App";
import { BOARDS } from "../../../core/types/board";
import { getAllProjects, updateProject, removeProject, duplicateProject, subscribeToProjects } from "../../../core/services/project/ProjectRepository";
import type { Project } from "../../../core/types/project";
import { ArrowLeft, Copy, Pencil, Plus, Trash2 } from "lucide-react";

interface Props { setPage: (page: Page) => void }

function ProjectsPage({ setPage }: Props) {
  const [projects, setProjects] = useState<Project[]>(() => getAllProjects());
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  useEffect(() => {
    return subscribeToProjects(() => setProjects(getAllProjects()));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => setPage({ name: "home" })}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-xl">My Projects</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto flex flex-col gap-3">
        <button
          onClick={() => setPage({ name: "new" })}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-bold shadow-[var(--shadow-pop)] active:scale-[0.98] transition"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>

        {projects.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-medium">No projects yet</p>
            <p className="text-xs mt-1">Tap New Project to get started!</p>
          </div>
        )}

        {projects.map((p) => (
          <div key={p.id} className="bg-card border-2 border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl">
              {BOARDS[p.board].emoji}
            </div>

            <div className="flex-1 min-w-0">
              {renameId === p.id ? (
                <input
                  autoFocus
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onBlur={() => {
                    updateProject(p.id, { name: renameVal || p.name });
                    setRenameId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full px-2 py-1 rounded-md border border-primary bg-background text-sm font-bold"
                />
              ) : (
                <button
                  onClick={() => setPage({ name: "editor", id: p.id })}
                  className="font-bold truncate block text-left"
                >
                  {p.name}
                </button>
              )}
              <div className="text-xs text-muted-foreground">
                {BOARDS[p.board].name} • {p.blocks.length} blocks
              </div>
            </div>

            <button
              onClick={() => { setRenameId(p.id); setRenameVal(p.name); }}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70"
              aria-label="Rename"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              onClick={() => duplicateProject(p.id)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70"
              aria-label="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={() => { if (confirm(`Delete "${p.name}"?`)) removeProject(p.id); }}
              className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}

export default ProjectsPage;
