import { useState } from "react";
import type { Page } from "../../../app/App";
import { BOARDS, type BoardType } from "../../../core/types/board";
import { createProject } from "../../../core/services/project/ProjectRepository";
import { ArrowLeft, Cpu, Wifi, Bluetooth } from "lucide-react";

interface Props { setPage: (page: Page) => void }

const FEATURES: Record<BoardType, string[]> = {
  uno: ["14 digital pins", "6 analog pins", "Beginner friendly"],
  nano: ["Compact", "Breadboard-ready", "Same as Uno"],
  mega: ["54 digital pins", "16 analog pins", "4 UART ports"],
  leonardo: ["Built-in USB HID", "20 digital pins", "12 analog pins"],
  esp32: ["Wi-Fi included", "Bluetooth", "Powerful dual-core"],
  esp8266: ["Wi-Fi included", "Low cost", "ESP8266EX chip"],
  pico: ["ARM Cortex-M0+", "Dual-core", "PIO support"],
};

function NewProjectPage({ setPage }: Props) {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [name, setName] = useState("My Robot");

  const start = () => {
    if (!board) return;
    const project = createProject(name.trim() || "Untitled", board);
    setPage({ name: "editor", id: project.id });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => setPage({ name: "home" })}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-xl">New Project</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <label className="text-sm font-semibold">Project name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full px-4 py-3 rounded-2xl bg-card border-2 border-border text-base font-medium focus:outline-none focus:border-primary"
            placeholder="My Cool Robot"
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3">Choose your board</h2>
          <div className="flex flex-col gap-3">
            {(Object.keys(BOARDS) as BoardType[]).map((b) => {
              const selected = board === b;
              return (
                <button
                  key={b}
                  onClick={() => setBoard(b)}
                  className={`text-left p-4 rounded-2xl border-2 bg-card transition-all active:scale-[0.98] ${
                    selected ? "border-primary shadow-[var(--shadow-pop)]" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-3xl">
                      {BOARDS[b].emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{BOARDS[b].name}</span>
                        {(b === "esp32" || b === "esp8266") && (
                          <><Wifi className="w-4 h-4" />{b === "esp32" && <Bluetooth className="w-4 h-4" />}</>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{BOARDS[b].tagline}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {FEATURES[b].map((f) => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-medium">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selected ? "border-primary bg-primary" : "border-border"
                    }`}>
                      {selected && <Cpu className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!board}
          className="mt-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-[var(--shadow-pop)] disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition"
        >
          Start Coding 🚀
        </button>
      </main>
    </div>
  );
}

export default NewProjectPage;
