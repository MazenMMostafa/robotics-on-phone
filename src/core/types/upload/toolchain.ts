export type ToolchainStatus = "installed" | "missing" | "outdated" | "unsupported" | "broken";

export interface ToolchainInfo {
  id: string;
  name: string;
  version: string;
  status: ToolchainStatus;
  installPath?: string;
  supportedBoards: string[];
  detectedAt?: number;
  error?: string;
}
