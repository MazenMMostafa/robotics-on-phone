import type { ConnectionType } from "./connection";
import type { BoardType } from "../board";

export interface DeviceInfo {
  id: string;
  name: string;
  vendorId?: number;
  productId?: number;
  connectionType: ConnectionType;
  connectionKey: string;
  boardType?: BoardType;
  lastConnected?: number;
  trusted?: boolean;
}

export type DeviceState = "available" | "connecting" | "connected" | "disconnecting" | "disconnected" | "error";

export interface DeviceEvent {
  device: DeviceInfo;
  timestamp: number;
}

export interface DiscoveryFilter {
  connectionType?: ConnectionType;
  vendorId?: number;
  productId?: number;
  timeout?: number;
}
