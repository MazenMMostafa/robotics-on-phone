export interface PipelineOptions {
  boardId: string;
  framework: string;
  language: string;
  workspaceXml?: string;
  blocks?: Record<string, unknown>[];
  portId: string;
  baudRate?: number;
  additionalArgs?: Record<string, unknown>;
}

export interface PipelineResult {
  status: "success" | "failure" | "cancelled";
  stage: PipelineStage;
  message: string;
  duration: number;
  generationDuration: number;
  buildDuration: number;
  uploadDuration: number;
  sourceArtifactChecksum?: string;
  buildArtifactChecksum?: string;
  firmwarePath?: string;
  bytesUploaded?: number;
  timestamp: number;
}

import type { PipelineStage } from "./progress";
