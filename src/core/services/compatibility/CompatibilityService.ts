import type { CompatibilityReport, CompatibilityLevel, CompatibilityIssue } from "../../types/hardware";
import { BoardService } from "../board/BoardService";
import { ComponentService } from "../component/ComponentService";

export class CompatibilityService {
  checkComponent(boardId: string, componentId: string): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];

    const board = BoardService.getBoard(boardId);
    if (!board) {
      return { compatible: false, level: "none", issues: [{ severity: "error", message: `Board "${boardId}" not found`, code: "BOARD_NOT_FOUND" }] };
    }

    const component = ComponentService.getComponent(componentId);
    if (!component) {
      return { compatible: false, level: "none", issues: [{ severity: "error", message: `Component "${componentId}" not found`, code: "COMPONENT_NOT_FOUND" }] };
    }

    if (!component.supportedBoards.includes(boardId) && !component.supportedBoards.includes("*")) {
      issues.push({ severity: "error", message: `Component "${component.displayName}" does not support "${board.displayName}"`, code: "BOARD_NOT_SUPPORTED" });
    }

    for (const lib of component.libraries) {
      if (!board.libraries.some((bl) => bl.toLowerCase().includes(lib.toLowerCase()))) {
        issues.push({ severity: "warning", message: `Library "${lib}" may not be available on "${board.displayName}"`, code: "LIBRARY_NOT_FOUND" });
      }
    }

    for (const pin of component.requiredPins) {
      if (pin.type === "pwm" && !board.capabilities.includes("pwm")) {
        issues.push({ severity: "error", message: `Component requires PWM but board does not support it`, code: "PWM_NOT_SUPPORTED" });
      }
    }

    const level: CompatibilityLevel = issues.some((i) => i.severity === "error") ? "none" : issues.length > 0 ? "partial" : "full";
    return { compatible: level !== "none", level, issues };
  }

  checkBlock(boardId: string, _blockType: string): CompatibilityReport {
    const board = BoardService.getBoard(boardId);
    if (!board) {
      return { compatible: false, level: "none", issues: [{ severity: "error", message: `Board "${boardId}" not found`, code: "BOARD_NOT_FOUND" }] };
    }
    return { compatible: true, level: "full", issues: [] };
  }

  checkLibrary(boardId: string, library: string): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];
    const board = BoardService.getBoard(boardId);

    if (!board) {
      return { compatible: false, level: "none", issues: [{ severity: "error", message: `Board "${boardId}" not found`, code: "BOARD_NOT_FOUND" }] };
    }

    const supported = board.libraries.some((l) => l.toLowerCase().includes(library.toLowerCase()));
    if (!supported) {
      issues.push({ severity: "error", message: `Library "${library}" is not supported on "${board.displayName}"`, code: "LIBRARY_NOT_SUPPORTED" });
    }

    const level = issues.length > 0 ? "none" : "full";
    return { compatible: level !== "none", level, issues };
  }

  checkExtension(boardId: string, manifest: { supportedBoards: string[]; dependencies?: { boards?: string[] } }): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];
    const board = BoardService.getBoard(boardId);

    if (!board) {
      return { compatible: false, level: "none", issues: [{ severity: "error", message: `Board "${boardId}" not found`, code: "BOARD_NOT_FOUND" }] };
    }

    if (manifest.supportedBoards.length > 0 && !manifest.supportedBoards.includes(boardId) && !manifest.supportedBoards.includes("*")) {
      issues.push({ severity: "error", message: `Extension does not support "${board.displayName}"`, code: "BOARD_NOT_SUPPORTED" });
    }

    const depBoards = manifest.dependencies?.boards ?? [];
    for (const depBoard of depBoards) {
      if (depBoard !== boardId && !BoardService.getBoard(depBoard)) {
        issues.push({ severity: "error", message: `Required board "${depBoard}" not found`, code: "DEP_BOARD_NOT_FOUND" });
      }
    }

    const level: CompatibilityLevel = issues.some((i) => i.severity === "error") ? "none" : "full";
    return { compatible: level !== "none", level, issues };
  }

  checkExample(boardId: string, example: { board?: string }): CompatibilityReport {
    if (!example.board || example.board === "*") {
      return { compatible: true, level: "full", issues: [] };
    }
    if (example.board === boardId) {
      return { compatible: true, level: "full", issues: [] };
    }
    return { compatible: false, level: "none", issues: [{ severity: "error", message: `Example requires board "${example.board}"`, code: "BOARD_MISMATCH" }] };
  }
}
