import type { Page } from "../App";
import { ArrowLeft } from "lucide-react";

interface Props {
  setPage: (page: Page) => void;
}

function HelpPage({ setPage }: Props) {
  const lessons = [
    "Blink LED",
    "Button controls LED",
    "Buzzer sound",
    "Servo movement",
    "ESP32 Wi-Fi example",
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => setPage({ name: "home" })}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-xl">Help</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto flex flex-col gap-3">
        {lessons.map((lesson) => (
          <div
            key={lesson}
            className="p-4 rounded-2xl bg-card border-2 border-border"
          >
            <h2 className="font-bold">{lesson}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tutorial coming soon.
            </p>
          </div>
        ))}
      </main>
    </div>
  );
}

export default HelpPage;
