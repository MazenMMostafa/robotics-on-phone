export type ResetStrategy = "dtr" | "rts" | "dtr_rts" | "touch" | "none";

export type VerificationStrategy = "checksum" | "compare" | "none";

export interface UploadBoardMapping {
  preferredUploadEngine: string;
  supportedUploadEngines: string[];
  bootloader: string;
  defaultBaudRate: number;
  resetStrategy: ResetStrategy;
  verificationStrategy: VerificationStrategy;
}
