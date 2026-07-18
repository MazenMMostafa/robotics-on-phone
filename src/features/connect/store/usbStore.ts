import { create } from "zustand";
import { usbService } from "../../../core/services/usb/UsbService";
import type { UsbDevice } from "../../../core/types/usb";

interface UsbStore {
  devices: UsbDevice[];
  connected: boolean;
  connecting: boolean;
  reading: boolean;
  terminal: string[];
  logs: string[];
  scan: () => Promise<void>;
  connect: (device: UsbDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  send: (message: string) => Promise<void>;
  startReading: () => void;
  stopReading: () => void;
  clearLogs: () => void;
  clearTerminal: () => void;
  syncState: () => void;
}

export const useUsbStore = create<UsbStore>((set) => ({
  devices: [],
  connected: false,
  connecting: false,
  reading: false,
  terminal: [],
  logs: [],

  syncState: () => {
    const state = usbService.getState();
    set({
      connected: state.connected,
      connecting: state.connecting,
      reading: state.reading,
      terminal: usbService.getTerminal(),
      logs: usbService.getLogs(),
    });
  },

  scan: async () => {
    try {
      const devices = await usbService.scan();
      set({ devices });
    } catch {
      set({ devices: [] });
    }
  },

  connect: async (device) => {
    set({ connecting: true });
    try {
      await usbService.connect(device);
      set({ connected: true, connecting: false });
    } catch (e) {
      set({ connected: false, connecting: false });
      throw e;
    }
  },

  disconnect: async () => {
    await usbService.disconnect();
    set({ connected: false, reading: false, terminal: [], logs: [] });
  },

  send: async (message) => {
    await usbService.send(message);
  },

  startReading: () => {
    usbService.startReading();
    set({ reading: true });
  },

  stopReading: () => {
    usbService.stopReading();
    set({ reading: false });
  },

  clearLogs: () => {
    usbService.clearLogs();
    set({ logs: [] });
  },

  clearTerminal: () => {
    usbService.clearTerminal();
    set({ terminal: [] });
  },
}));
