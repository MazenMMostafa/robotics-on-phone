import { create } from "zustand";

export type UploadStatus = "idle" | "uploading" | "done" | "fail";
export type CopyStatus = "idle" | "copied" | "fail";

interface EditorStore {
  showCodeModal: boolean;
  showSettings: boolean;
  generatedCode: string;
  copyStatus: CopyStatus;
  uploadStatus: UploadStatus;
  projectName: string;
  openCodeModal: () => void;
  closeCodeModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setGeneratedCode: (code: string) => void;
  setCopyStatus: (status: CopyStatus) => void;
  setUploadStatus: (status: UploadStatus) => void;
  setProjectName: (name: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  showCodeModal: false,
  showSettings: false,
  generatedCode: "",
  copyStatus: "idle",
  uploadStatus: "idle",
  projectName: "",

  openCodeModal: () => set({ showCodeModal: true }),
  closeCodeModal: () => set({ showCodeModal: false }),
  openSettings: () => set({ showSettings: true }),
  closeSettings: () => set({ showSettings: false }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
  setCopyStatus: (copyStatus) => set({ copyStatus }),
  setUploadStatus: (uploadStatus) => set({ uploadStatus }),
  setProjectName: (projectName) => set({ projectName }),
}));
