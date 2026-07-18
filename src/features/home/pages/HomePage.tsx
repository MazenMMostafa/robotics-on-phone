import type { Page } from "../../../app/App";

type Props = { setPage: (page: Page) => void };

export default function HomePage({ setPage }: Props) {
  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <section className="max-w-5xl mx-auto py-10">
        <div className="rounded-3xl bg-card p-8 border-2 border-border">
          <p className="text-primary font-semibold mb-3">NewBegin Makes</p>
          <h1 className="text-4xl font-bold mb-4">
            Block Coding for Arduino and ESP32
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl">
            Build projects using blocks, generate Arduino code, then download
            your .ino file.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setPage({ name: "new" })}
              className="rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold"
            >
              New Project
            </button>
            <button
              onClick={() => setPage({ name: "projects" })}
              className="rounded-xl bg-secondary text-secondary-foreground px-5 py-3 font-semibold"
            >
              My Projects
            </button>
            <button
              onClick={() => setPage({ name: "connect" })}
              className="rounded-xl bg-secondary text-secondary-foreground px-5 py-3 font-semibold"
            >
              Connect Board
            </button>
            <button
              onClick={() => setPage({ name: "help" })}
              className="rounded-xl bg-secondary text-secondary-foreground px-5 py-3 font-semibold"
            >
              Help
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
