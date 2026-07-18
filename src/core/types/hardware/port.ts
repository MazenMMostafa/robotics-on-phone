import type { ConnectionType } from "./connection";

export interface PortInfo {
  id: string;
  name: string;
  path?: string;
  description?: string;
  connectionType: ConnectionType;
  vendorId?: number;
  productId?: number;
  available: boolean;
}

export type PortState = "available" | "in-use" | "unavailable";

export interface PortEvent {
  port: PortInfo;
  timestamp: number;
}
