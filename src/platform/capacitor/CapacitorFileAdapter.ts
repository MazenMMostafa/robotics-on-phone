import type { FileAdapter } from "../../core/platform/types";

export class CapacitorFileAdapter implements FileAdapter {
  download(filename: string, content: string, mimeType = "text/plain;charset=utf-8"): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  readFile(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }
}

export const capacitorFileAdapter = new CapacitorFileAdapter();
