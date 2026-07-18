import { describe, it, expect, beforeEach } from "vitest";
import { DialogService } from "../../services/dialog/DialogService";
import { LoggerService } from "../../services/logging/LoggerService";

describe("DialogService", () => {
  let ds: DialogService;
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService();
    ds = new DialogService(logger);
  });

  it("alert shows dialog", async () => {
    const promise = ds.alert("Title", "Message");
    expect(ds.getCurrent()).not.toBeNull();
    expect(ds.getCurrent()!.options.type).toBe("alert");
    ds.resolve(ds.getCurrent()!.id, { action: "confirm" });
    const result = await promise;
    expect(result.action).toBe("confirm");
  });

  it("confirm shows dialog", async () => {
    const promise = ds.confirm("Title", "Message", "Yes", "No");
    expect(ds.getCurrent()!.options.confirmText).toBe("Yes");
    expect(ds.getCurrent()!.options.cancelText).toBe("No");
    ds.resolve(ds.getCurrent()!.id, { action: "cancel" });
    const result = await promise;
    expect(result.action).toBe("cancel");
  });

  it("prompt shows dialog with default value", async () => {
    const promise = ds.prompt("Title", "Enter name", "John");
    expect(ds.getCurrent()!.options.defaultValue).toBe("John");
    ds.resolve(ds.getCurrent()!.id, { action: "confirm", value: "Jane" });
    const result = await promise;
    expect(result.action).toBe("confirm");
    if (result.action === "confirm") {
      expect(result.value).toBe("Jane");
    }
  });

  it("progress shows dialog", () => {
    const { id, promise } = ds.progress("Title", "Working...");
    expect(ds.getCurrent()!.options.type).toBe("progress");
    ds.updateProgress(id, 50);
    expect(ds.getCurrent()!.options.progress).toBe(50);
    ds.resolve(id, { action: "confirm" });
    return promise.then((r) => expect(r.action).toBe("confirm"));
  });

  it("getCurrent returns null when no dialog", () => {
    expect(ds.getCurrent()).toBeNull();
  });

  it("resolve clears current dialog", () => {
    ds.alert("Title", "Msg");
    expect(ds.getCurrent()).not.toBeNull();
    ds.resolve(ds.getCurrent()!.id, { action: "confirm" });
    expect(ds.getCurrent()).toBeNull();
  });
});
