import { execSync, execFileSync } from "child_process";
import { existsSync, statSync, readdirSync } from "fs";
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

  validateInstallation(requiredCores: string[] = ["arduino:avr"]): { valid: boolean; missingCores: string[]; details: string } {
    const info = this.detectTool();
    if (!info) {
      return { valid: false, missingCores: requiredCores, details: "arduino-cli executable not found" };
    }
    const installed = this.discoverCores();
    const missingCores = requiredCores.filter((core) => !installed.includes(core));
    if (missingCores.length > 0) {
      return {
        valid: false,
        missingCores,
        details: `Missing required cores: ${missingCores.join(", ")}`,
      };
    }
    return { valid: true, missingCores: [], details: `arduino-cli ${info.version} ready` };
  }

  discoverCores(): string[] {
    const cliPath = this.getPath();
    if (!cliPath) return [];
    try {
      const stdout = execSync(`${cliPath} core list 2>&1`, {
        encoding: "utf-8",
        timeout: 30_000,
      });
      return this.parseCoreList(stdout);
    } catch {
      return [];
    }
  }

  discoverLibraries(): string[] {
    const cliPath = this.getPath();
    if (!cliPath) return [];
    try {
      const stdout = execSync(`${cliPath} lib list 2>&1`, {
        encoding: "utf-8",
        timeout: 30_000,
      });
      return this.parseLibraryList(stdout);
    } catch {
      return [];
    }
  }

  private parseCoreList(output: string): string[] {
    const cores: string[] = [];
    const lines = output.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("ID") && /Installed/.test(trimmed)) continue;
      const id = trimmed.split(/\s+/)[0];
      if (id && id.includes(":")) cores.push(id);
    }
    return cores;
  }

  private parseLibraryList(output: string): string[] {
    const libraries: string[] = [];
    const lines = output.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("Name") && /Installed/.test(trimmed)) continue;
      const name = trimmed.split(/\s+/)[0];
      if (name && name !== '"') libraries.push(name.replace(/^"|"$/g, ""));
    }
    return libraries;
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
    if (process.env.ARDUINO_CLI_PATH) {
      paths.push(process.env.ARDUINO_CLI_PATH);
    }
    if (isWin) {
      paths.push(
        join(process.env.LOCALAPPDATA ?? "", "Arduino15", exe),
        join(process.env.ProgramFiles ?? "", "Arduino", exe),
        join(process.env["ProgramFiles(x86)"] ?? "", "Arduino", exe),
        "C:\\arduino-cli\\arduino-cli.exe",
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
    if (options.buildPath) {
      args.push("--build-path", options.buildPath);
    }
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
    _fqbn: string,
  ): { hexPath?: string; elfPath?: string; mapPath?: string; size: number } {
    const result: { hexPath?: string; elfPath?: string; mapPath?: string; size: number } = {
      size: 0,
    };
    if (!buildPath || !existsSync(buildPath)) return result;

    const hexPath = this.findFirst(buildPath, ".ino.hex");
    const elfPath = this.findFirst(buildPath, ".ino.elf");
    const mapPath = this.findFirst(buildPath, ".ino.map");

    if (hexPath) {
      result.hexPath = hexPath;
      result.size = statSync(hexPath).size;
    } else if (elfPath) {
      result.elfPath = elfPath;
      result.size = statSync(elfPath).size;
    }
    if (elfPath && !result.elfPath) result.elfPath = elfPath;
    if (mapPath) result.mapPath = mapPath;
    return result;
  }

  private findFirst(dir: string, suffix: string): string | undefined {
    let found: string | undefined;
    const walk = (current: string): void => {
      if (found) return;
      let entries: string[];
      try {
        entries = readdirSync(current);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (found) return;
        const full = join(current, entry);
        try {
          const st = statSync(full);
          if (st.isDirectory()) {
            walk(full);
          } else if (entry.endsWith(suffix)) {
            found = full;
          }
        } catch {
          // ignore unreadable entries
        }
      }
    };
    walk(dir);
    return found;
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
