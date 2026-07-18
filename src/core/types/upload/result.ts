export type UploadResultStatus = "success" | "failure" | "cancelled";

export interface UploadResult {
  status: UploadResultStatus;
  stage: string;
  message: string;
  duration: number;
  errorCode?: string;
  errorMessage?: string;
  bytesUploaded?: number;
  timestamp: number;
}
