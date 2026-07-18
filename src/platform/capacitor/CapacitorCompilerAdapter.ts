import type { CompilerAdapter, CompileRequest } from "../../core/platform/types";

export class CapacitorCompilerAdapter implements CompilerAdapter {
  async compile(request: CompileRequest): Promise<string> {
    const serverUrl = request.serverUrl || "http://192.168.2.11:8787";
    let response: Response;

    try {
      response = await fetch(`${serverUrl}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: request.code, board: request.board }),
      });
    } catch (e) {
      throw new Error(
        `Network error: ${e instanceof Error ? e.message : String(e)}`,
        { cause: e },
      );
    }

    const text = await response.text();
    let data: { ok?: boolean; hex?: string; error?: string };

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid server response: ${text}`);
    }

    if (!response.ok) {
      throw new Error(data.error || "Compile failed");
    }

    if (!data.hex) {
      throw new Error("Compile succeeded but HEX is missing");
    }

    return data.hex;
  }
}

export const capacitorCompilerAdapter = new CapacitorCompilerAdapter();
