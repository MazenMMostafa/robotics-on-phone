import { execSync, execFileSync } from "child_process";
import { existsSync, statSync } from "fs";
import { join } from "path";
import type {
  ArduinoCliCompileOptions,
  ArduinoCliCompileResult,
  ArduinoCliToolInfo,
} from "./types";

const DEFAULT_TIMEOUT_MS = 120_000;

export class ArduinoCliAdapter {
  private cliPath: string | null = null;
  private cachedVersion: string | null = null;

  detectTool(): ArduinoCliToolInfo | null {
    if (this.cliPath && this.cachedVersion) {
      return { path: this.cliPath, version: this.cachedVersion };
    }
    const candidates = this.getCandidatePaths();
    for (const candidate of candidates) {
      try {
        const stdout = execSync(`${candidate} version 2>&1`, {
          encoding: "utf-8",
          timeout: 10_000,
        });
        const version = this.parseVersion(stdout);
        if (version) {
          this.cliPath = candidate;
          this.cachedVersion = version;
          return { path: candidate, version };
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  getVersion(): string {
    if (this.cachedVersion) return this.cachedVersion;
    const info = this.detectTool();
    if (!info) return "0.0.0";
    return info.version;
  }

  getPath(): string | null {
    if (this.cliPath) return this.cliPath;
    const info = this.detectTool();
    return info ? info.path : null;
  }

  compile(options: ArduinoCliCompileOptions): ArduinoCliCompileResult {
    const cliPath = this.getPath();
    if (!cliPath) {
      return {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: "arduino-cli not found",
        size: 0,
        warnings: [],
        errors: ["arduino-cli not found"],
      };
    }

    const args = this.buildCompileArgs(options);

    try {
      const stdout = execFileSync(cliPath, args, {
        encoding: "utf-8",
        timeout: DEFAULT_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
      });
      const buildOutput = this.findBuildOutput(options.buildPath, options.fqbn);
      const warnings = this.parseWarnings(stdout);
      return {
        success: true,
        exitCode: 0,
        stdout,
        stderr: "",
        size: buildOutput.size,
        hexPath: buildOutput.hexPath,
        elfPath: buildOutput.elfPath,
        mapPath: buildOutput.mapPath,
        warnings,
        errors: [],
      };
    } catch (err: unknown) {
      const error = err as {
        status?: number;
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const stderr = error.stderr ?? error.message ?? "Unknown error";
      const exitCode = error.status ?? 1;
      const parsedErrors = this.parseErrors(stderr);
      return {
        success: false,
        exitCode,
        stdout: error.stdout ?? "",
        stderr,
        size: 0,
        warnings: [],
        errors: parsedErrors.length > 0 ? parsedErrors : [stderr],
      };
    }
  }

  parseErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split("\n");
    for (const line of lines) {
      if (this.isErrorLine(line)) {
        errors.push(line.trim());
      }
    }
    return errors;
  }

  parseWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes("warning:") || line.includes("Warning:")) {
        warnings.push(line.trim());
      }
    }
    return warnings;
  }

  private getCandidatePaths(): string[] {
    const isWin = process.platform === "win32";
    const exe = isWin ? "arduino-cli.exe" : "arduino-cli";
    const paths = [exe];
    if (isWin) {
      paths.push(
        join(process.env.LOCALAPPDATA ?? "", "Arduino15", exe),
        join(process.env.ProgramFiles ?? "", "Arduino", exe),
        join(process.env["ProgramFiles(x86)"] ?? "", "Arduino", exe),
      );
    } else {
      paths.push(
        "/usr/local/bin/arduino-cli",
        "/usr/bin/arduino-cli",
        `${process.env.HOME ?? ""}/.arduino15/arduino-cli`,
      );
    }
    return paths;
  }

  private parseVersion(output: string): string | null {
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  private buildCompileArgs(options: ArduinoCliCompileOptions): string[] {
    const args: string[] = ["compile", "--fqbn", options.fqbn];
    if (options.verbose) {
      args.push("--verbose");
    }
    if (options.libraries && options.libraries.length > 0) {
      for (const lib of options.libraries) {
        args.push("--libraries", lib);
      }
    }
    if (options.additionalFlags && options.additionalFlags.length > 0) {
      args.push(...options.additionalFlags);
    }
    args.push(options.sketchPath);
    return args;
  }

  private findBuildOutput(
    buildPath: string,
    fqbn: string,
  ): { hexPath?: string; elfPath?: string; mapPath?: string; size: number } {
    const fqbnPath = fqbn.replace(/:/g, ".");
    const candidateDirs = [
      join(buildPath, fqbnPath),
      buildPath,
    ];
    for (const dir of candidateDirs) {
      if (!existsSync(dir)) continue;
      const hexPath = join(dir, "sketch.ino.hex");
      const elfPath = join(dir, "sketch.ino.elf");
      const mapPath = join(dir, "sketch.ino.map");
      const result: { hexPath?: string; elfPath?: string; mapPath?: string; size: number } = {
        size: 0,
      };
      let found = false;
      if (existsSync(hexPath)) {
        result.hexPath = hexPath;
        result.size = statSync(hexPath).size;
        found = true;
      }
      if (existsSync(elfPath)) {
        result.elfPath = elfPath;
        if (!found) result.size = statSync(elfPath).size;
        found = true;
      }
      if (existsSync(mapPath)) {
        result.mapPath = mapPath;
      }
      return result;
    }
    return { size: 0 };
  }

  private isErrorLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("Error:")) return true;
    if (trimmed.includes("fatal error:")) return true;
    if (trimmed.includes("error:")) return true;
    if (/\.\w+:\d+:\d+:\s+error:/.test(trimmed)) return true;
    return false;
  }
}
