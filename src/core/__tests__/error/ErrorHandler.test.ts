// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ErrorHandler } from "../../services/error/ErrorHandler";
import { LoggerService } from "../../services/logging/LoggerService";
import { NotificationService } from "../../services/notification/NotificationService";

describe("ErrorHandler", () => {
  let handler: ErrorHandler;
  let logger: LoggerService;
  let notifier: NotificationService;

  beforeEach(() => {
    logger = new LoggerService();
    notifier = new NotificationService();
    handler = new ErrorHandler(logger, notifier);
  });

  it("handleError returns ErrorInfo", () => {
    const info = handler.handleError(new Error("test error"), "general");
    expect(info.message).toBe("test error");
    expect(info.type).toBe("general");
    expect(info.id).toMatch(/^err-/);
  });

  it("handleError creates friendly message for string errors", () => {
    const info = handler.handleError("timeout occurred");
    expect(info.friendlyMessage).toBe("The operation timed out. Please try again.");
  });

  it("handleError creates friendly message for error objects", () => {
    const info = handler.handleError(new Error("usb disconnected"), "upload");
    expect(info.friendlyMessage).toBe("USB connection lost. Please reconnect the board.");
  });

  it("handleError defaults to generic friendly message", () => {
    const info = handler.handleError("weird error");
    expect(info.friendlyMessage).toBe("An unexpected error occurred.");
  });

  it("handleError creates notification for non-fatal types", () => {
    handler.handleError(new Error("compile error"), "compile");
    expect(notifier.getQueue()).toHaveLength(1);
  });

  it("handleError does not create notification for unhandled types", () => {
    handler.handleError(new Error("crash"), "unhandled");
    expect(notifier.getQueue()).toHaveLength(0);
  });

  it("addDiagnosticHandler registers handler", () => {
    const fn = vi.fn();
    handler.addDiagnosticHandler(fn);
    handler.handleError(new Error("test"), "general");
    expect(fn).toHaveBeenCalled();
    expect(fn.mock.calls[0][0].message).toBe("test");
  });

  it("addDiagnosticHandler returns unsub function", () => {
    const fn = vi.fn();
    const unsub = handler.addDiagnosticHandler(fn);
    unsub();
    handler.handleError(new Error("test"), "general");
    expect(fn).not.toHaveBeenCalled();
  });

  it("install and uninstall global handlers", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const remSpy = vi.spyOn(window, "removeEventListener");
    handler.install();
    expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    handler.uninstall();
    expect(remSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(remSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    addSpy.mockRestore();
    remSpy.mockRestore();
  });
});
