import type { CompilerAdapter, CompileRequest } from "../../core/platform/types";

export class MockCompilerAdapter implements CompilerAdapter {
  compileResult = "";
  compileError: string | null = null;
  lastRequest: CompileRequest | null = null;

  async compile(request: CompileRequest): Promise<string> {
    this.lastRequest = request;
    if (this.compileError) throw new Error(this.compileError);
    return this.compileResult;
  }
}
