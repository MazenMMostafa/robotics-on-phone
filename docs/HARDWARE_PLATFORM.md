# Hardware Platform Architecture

## Overview

The Hardware Platform provides a unified abstraction over physical hardware — boards, ports, connections, and device lifecycle — enabling the app to discover, connect to, and communicate with microcontrollers (Arduino, ESP32, etc.) regardless of transport medium.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ExtensionContext                            │
│  getCurrentBoardId() · getBoardCapabilities() · isDeviceConnected│
└──────────────┬──────────────────────────────────────────────────┘
               │  DI: container.get("hardwareManager")
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HardwareManager                             │
│  selectBoard · getBoardCapabilities · boardHasCapability         │
│  createConnection                                               │
│  delegates to PortManager · DeviceManager                       │
└───────┬─────────────────────┬───────────────────┬───────────────┘
        │                     │                   │
        ▼                     ▼                   ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ portManager  │   │ deviceManager    │   │ compatibility    │
│ CRUD ports   │   │ lifecycle:       │   │ Service           │
│ select/clear │   │ add / remove     │   │ checkComponent   │
│ persist last │   │ connect / disconnect│ │ checkBlock       │
└──────┬───────┘   │ recent cache      │   │ checkLibrary     │
       │           └──────────────────┘   │ checkExtension   │
       ▼                                  │ checkExample     │
┌──────────────┐                           └──────────────────┘
│ Connection   │
│ Adapter      │
│ ┌──────────┐ │
│ │ USB      │ │  ← USBConnection (wraps USBAdapter)
│ │ Serial   │ │  ← stub
│ │ Bluetooth│ │  ← stub
│ │ WiFi     │ │  ← stub
│ └──────────┘ │
└──────────────┘
```

## Core Services

### HardwareManager (`src/core/services/hardware/HardwareManager.ts`)
The central coordinator. Owns board selection, capability queries, and connection factory methods. Delegates device lifecycle to `DeviceManager` and port management to `PortManager`.

- `selectBoard(boardId)` — sets current board, updates compatibility context
- `getBoardCapabilities()` — returns capability map of the selected board
- `boardHasCapability(capability)` — boolean capability check
- `createConnection(connectionType)` — factory that instantiates the right `ConnectionAdapter`

### DeviceManager (`src/core/services/device/DeviceManager.ts`)
Manages device lifecycle: add, remove, connect, disconnect. Caches recent devices via `StorageAdapter`. Emits `DeviceEvent` through the `EventBus`.

- `addDevice(info)` — registers a device, emits `device:added`
- `removeDevice(deviceId)` — unregisters, emits `device:removed`
- `connectDevice(deviceId)` — marks connected, emits `device:connected`
- `disconnectDevice(deviceId)` — marks disconnected, emits `device:disconnected`
- `getDevice(deviceId)` / `getAllDevices()` — queries
- `getRecentDevices()` / `clearRecentDevices()` — persisted via `StorageAdapter`
- `deviceExists(deviceId)` — existence check

### PortManager (`src/core/services/port/PortManager.ts`)
CRUD for serial/USB ports. Persists the last-selected port via `StorageAdapter`.

- `addPort(info)` — register a port
- `removePort(portId)` — unregister
- `selectPort(portId)` — set active port, persist choice
- `clearSelection()` — clear active port
- `getSelectedPort()` — retrieve currently selected port
- `getPort(portId)` / `getAllPorts()` — queries

### CompatibilityService (`src/core/services/compatibility/CompatibilityService.ts`)
Checks whether a component, block, library, extension, or example is compatible with the selected board. Returns a `CompatibilityReport` with `compatible`, `issues[]`, and `suggestions[]`.

- `checkComponent(componentId, boardId)` — component compatibility
- `checkBlock(blockId, boardId)` — block compatibility
- `checkLibrary(libraryId, boardId)` — library compatibility
- `checkExtension(extensionId, boardId)` — extension compatibility
- `checkExample(exampleId, boardId)` — example compatibility

All checks use the board's capability map (pins, protocols, memory, features).

## Connection Adapters

The `ConnectionAdapter` interface (`src/core/types/hardware/connection.ts`) defines:

```typescript
interface ConnectionAdapter {
  readonly type: ConnectionType;
  readonly state: ConnectionState;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  read(): Promise<ReadResult>;
  write(data: Uint8Array): Promise<WriteResult>;
  writeBytes(data: number[]): Promise<WriteResult>;
  readBytes(length: number): Promise<ReadResult>;
  flush(): Promise<void>;
}
```

| Implementation | File | Status |
|---------------|------|--------|
| `USBConnection` | `src/core/services/hardware/connections/USBConnection.ts` | ✅ Wraps USBAdapter |
| `SerialConnection` | `src/core/services/hardware/connections/SerialConnection.ts` | 🔧 Stub |
| `BluetoothConnection` | `src/core/services/hardware/connections/BluetoothConnection.ts` | 🔧 Stub |
| `WiFiConnection` | `src/core/services/hardware/connections/WiFiConnection.ts` | 🔧 Stub |

## Hardware Events (`src/core/services/hardware/HardwareEvents.ts`)

12 event names emitted via `EventBus`:

| Event | Payload | When |
|-------|---------|------|
| `hardware:board-selected` | `{ boardId }` | Board selected |
| `hardware:port-added` | `{ port }` | Port registered |
| `hardware:port-removed` | `{ portId }` | Port unregistered |
| `hardware:port-selected` | `{ port }` | Port selected |
| `hardware:port-cleared` | `{}` | Port selection cleared |
| `hardware:device-added` | `{ device }` | Device registered |
| `hardware:device-removed` | `{ deviceId }` | Device unregistered |
| `hardware:device-connected` | `{ deviceId }` | Device connected |
| `hardware:device-disconnected` | `{ deviceId }` | Device disconnected |
| `hardware:connection-created` | `{ connectionType, deviceId }` | Connection created |
| `hardware:compatibility-checked` | `{ boardId, report }` | Compatibility checked |
| `hardware:error` | `{ error }` | Hardware error occurred |

## ExtensionContext Integration

Three new methods exposed to extensions:

- `getCurrentBoardId()` — returns the currently selected board ID or `null`
- `getBoardCapabilities()` — returns `BoardCapabilityMap` or `null`
- `isDeviceConnected()` — checks if any device is currently connected

These are injected via DI: `container.get("hardwareManager")`.

## Type Definitions

All hardware types live under `src/core/types/hardware/`:

- `connection.ts` — `ConnectionAdapter` interface, `ConnectionType`, `ConnectionState`, `ReadResult`, `WriteResult`
- `device.ts` — `DeviceInfo`, `DeviceState`, `DeviceEvent`, `DiscoveryFilter`
- `port.ts` — `PortInfo`, `PortState`, `PortEvent`
- `capability.ts` — `BoardCapability`, `BoardCapabilityMap`, `BoardCapabilityInfo`, `CompatibilityReport`, `CompatibilityIssue`, `SupportedFramework`
- `index.ts` — barrel exports
