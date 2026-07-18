import { useRef, useState } from "react";
import { compileArduinoCode } from "../../../core/services/compiler/CompileClient";
import { uploadHex } from "../../../core/services/stk500/Stk500Uploader";
import { usbService } from "../../../core/services/usb/UsbService";
import type { Page } from "../../../app/App";
import { BOARDS } from "../../../core/types/board";
import { getProject } from "../../../core/services/project/ProjectRepository";
import { BlocklyWorkspace } from "../../blockly/workspace/BlocklyWorkspace";
import { useProjectStore } from "../../projects/store/projectStore";
import {
  ArrowLeft, Check, Code2, Copy, Download, Play, Settings, Upload, X,
} from "lucide-react";

interface Props { id: string; setPage: (page: Page) => void }

type UploadStatus = "idle" | "uploading" | "done" | "fail";
type CopyStatus = "idle" | "copied" | "fail";
type WindowWithCode = Window & { getCode?: () => string };

function EditorPage({ id, setPage }: Props) {
  const { removeProject, updateProject } = useProjectStore();
  const project = getProject(id);

  const [showSettings, setShowSettings] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [projectName, setProjectName] = useState(project?.name ?? "");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 bg-background">
        <p className="text-muted-foreground">Project not found.</p>
        <button
          onClick={() => setPage({ name: "projects" })}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold"
        >
          Back to projects
        </button>
      </div>
    );
  }

  const handleXmlChange = (xml: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      updateProject(project.id, { xml });
    }, 300);
  };

  const getCurrentCode = () => {
    const getCode = (window as WindowWithCode).getCode;
    return typeof getCode === "function" ? getCode() : "";
  };

  const handleGenerateCode = () => {
    setCopyStatus("idle");
    try {
      const code = getCurrentCode();
      setGeneratedCode(
        code.trim().length > 0
          ? code
          : "// Code generator is not ready yet.\n// Try again after the Blockly workspace loads.",
      );
      setShowCodeModal(true);
    } catch (error) {
      console.error("Generate code failed:", error);
      setGeneratedCode("// Failed to generate Arduino code.\n// Check the browser console for details.");
      setShowCodeModal(true);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch (error) {
      console.error("Copy failed:", error);
      setCopyStatus("fail");
    }
  };

  const handleDownloadIno = () => {
    const code = generatedCode.trim().length > 0 ? generatedCode : getCurrentCode();
    if (!code || code.trim().length === 0) { alert("No code to download"); return; }

    const safeName = project.name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
    const fileName = `${safeName || "arduino_code"}.ino`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = fileName;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    const code = getCurrentCode();
    const usbState = usbService.getState();

    if (project.board === "esp32") {
      alert("ESP32 upload is not supported yet. UNO/Nano only for now.");
      return;
    }
    if (!code || code.trim().length === 0) { alert("No code to upload"); return; }
    if (!usbState.connected) {
      alert("Connect your Arduino first");
      setPage({ name: "connect", backTo: { name: "editor", id: project.id } });
      return;
    }

    setUploadStatus("uploading");
    try {
      const hex = await compileArduinoCode({
        board: project.board === "nano" ? "nano" : "uno",
        code,
      });
      console.log("HEX ready:", hex.slice(0, 200));
      console.log("HEX length:", hex.length);

      usbService.stopReading();
      if (project.board === "nano") {
        try { await uploadHex(hex, 115200); }
        catch (firstError) {
          console.warn("Nano upload failed at 115200, retrying 57600...", firstError);
          await uploadHex(hex, 57600);
        }
      } else { await uploadHex(hex, 115200); }

      setUploadStatus("done");
      alert("Upload done 🚀");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Upload failed:", e);
      setUploadStatus("fail");
      alert(`Upload failed:\n${message}`);
    }
  };

  const handleRename = (name: string) => {
    setProjectName(name);
    updateProject(project.id, { name });
  };

  return (
    <div className="relative h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 flex items-center gap-2 px-3 py-2 bg-background border-b border-border z-20">
        <button onClick={() => setPage({ name: "projects" })} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{project.name}</div>
          <div className="text-[10px] text-muted-foreground">{BOARDS[project.board].name}</div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center" aria-label="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 relative min-h-0 w-full overflow-hidden">
        <BlocklyWorkspace board={project.board} initialXml={project.xml} onChange={handleXmlChange} />
      </div>

      <div className="shrink-0 border-t border-border bg-background p-3 flex items-center gap-2 z-20">
        <div className={`text-xs font-semibold flex-1 ${
          uploadStatus === "done" ? "text-[oklch(0.55_0.18_145)]" :
          uploadStatus === "fail" ? "text-destructive" : "text-muted-foreground"
        }`}>
          {uploadStatus === "idle" && "Ready to upload"}
          {uploadStatus === "uploading" && "Uploading to board…"}
          {uploadStatus === "done" && "✓ Upload complete!"}
          {uploadStatus === "fail" && "✗ Upload failed"}
        </div>

        <button onClick={handleGenerateCode} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold flex items-center gap-1 active:scale-95 transition">
          <Code2 className="w-4 h-4" /> Code
        </button>
        <button onClick={() => setPage({ name: "connect", backTo: { name: "editor", id: project.id } })}
          className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold">
          Connect
        </button>
        <button onClick={handleUpload} disabled={uploadStatus === "uploading"}
          className="px-5 py-3 rounded-2xl bg-gradient-to-br from-[oklch(0.7_0.18_145)] to-[oklch(0.6_0.2_165)] text-white font-bold shadow-[var(--shadow-pop)] active:scale-95 transition flex items-center gap-2 disabled:opacity-60">
          {uploadStatus === "uploading" ? <Play className="w-4 h-4 animate-pulse" /> : <Upload className="w-4 h-4" />}
          Upload
        </button>
      </div>

      {showCodeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" onClick={() => setShowCodeModal(false)}>
          <div className="bg-card rounded-3xl p-5 w-full max-w-2xl max-h-[88dvh] flex flex-col gap-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center"><Code2 className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg leading-tight">Arduino Code</h2>
                <p className="text-xs text-muted-foreground">Generated from your blocks</p>
              </div>
              <button onClick={() => setShowCodeModal(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <pre className="flex-1 min-h-[260px] max-h-[55dvh] overflow-auto rounded-2xl bg-black text-white p-4 text-xs leading-relaxed text-left">
              <code>{generatedCode}</code>
            </pre>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleCopyCode} className="py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                {copyStatus === "copied" ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
              <button onClick={handleDownloadIno} className="py-3 rounded-xl bg-secondary font-bold flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> .ino
              </button>
              <button onClick={() => setShowCodeModal(false)} className="py-3 rounded-xl bg-secondary font-bold">Done</button>
            </div>
            {copyStatus === "fail" && <p className="text-xs text-destructive font-semibold">Copy failed. Select the code manually and copy it.</p>}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-card rounded-3xl p-5 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-3">Project settings</h2>
            <label className="text-xs font-semibold">Name</label>
            <input value={projectName} onChange={(e) => handleRename(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-border mt-1 mb-3 font-medium" />
            <div className="flex gap-2">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-3 rounded-xl bg-secondary font-bold">Done</button>
              <button onClick={() => { if (confirm("Delete this project?")) { removeProject(project.id); setPage({ name: "projects" }); } }}
                className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorPage;
