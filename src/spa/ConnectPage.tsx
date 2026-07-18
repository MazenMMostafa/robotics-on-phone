import { useEffect, useState } from "react";
import type { Page } from "../App";
import { usbService, type UsbDevice } from "../lib/UsbConnection";
import {
  ArrowLeft,
  PlugZap,
  RefreshCw,
  Send,
  Usb,
  XCircle,
} from "lucide-react";

interface Props {
  setPage: (page: Page) => void;
  backTo?: Page;
}

function ConnectPage({ setPage, backTo }: Props) {
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [command, setCommand] = useState("");
  const [, forceUpdate] = useState(0);

  const state = usbService.getState();
  const log = usbService.getLogs();
  const terminal = usbService.getTerminal();

  useEffect(() => {
    return usbService.subscribe(() => {
      forceUpdate((x) => x + 1);
    });
  }, []);

  const addLog = (msg: string) => {
    usbService.addLog(msg);
  };

  const scan = async () => {
    try {
      addLog("Scanning...");
      const found = await usbService.scan();
      setDevices(found);
      addLog(`Found ${found.length} device(s)`);
    } catch (e) {
      addLog(`Scan failed: ${String(e)}`);
    }
  };

  const connect = async (device: UsbDevice) => {
    try {
      addLog("Connecting...");
      await usbService.connect(device);
      addLog(`Connected using key: ${device.deviceKey || device.deviceId}`);

      try {
        await usbService.setDTR(false);
        addLog("DTR false OK");

        await new Promise((resolve) => setTimeout(resolve, 100));

        await usbService.setDTR(true);
        addLog("DTR true OK");
        addLog("DTR toggled successfully");
        await new Promise((resolve) => setTimeout(resolve, 800));

        await usbService.writeBytes([0x30, 0x20]);
        addLog("Sent STK500 SYNC");

        const res = await usbService.readBytes();
        addLog("SYNC response: " + JSON.stringify(res.data));
      } catch (e) {
        addLog(`DTR failed: ${String(e)}`);
      }

      usbService.startReading();
    } catch (e) {
      addLog(`Connection failed: ${String(e)}`);
    }
  };

  const disconnect = async () => {
    await usbService.disconnect();
    addLog("Disconnected");
  };

  const sendTest = async () => {
    try {
      await usbService.send("Hello from NewBegin Makes\n");
      addLog("Sent test message");
    } catch (e) {
      addLog(`Send failed: ${String(e)}`);
    }
  };

  const sendCommand = async () => {
    const text = command.trim();

    if (!text) return;

    try {
      await usbService.send(`${text}\n`);
      addLog(`Sent: ${text}`);
      setCommand("");
    } catch (e) {
      addLog(`Send failed: ${String(e)}`);
    }
  };

  const read = async () => {
    try {
      const result = await usbService.read();
      const data = result?.data || "";

      if (data) {
        usbService.addTerminal(data);
      }

      addLog(`Read: ${data || "(empty)"}`);
    } catch (e) {
      addLog(`Read failed: ${String(e)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => setPage(backTo ?? { name: "home" })}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-black text-xl">Connect Board</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto flex flex-col gap-4">
        <div className="p-5 rounded-3xl bg-card border-2 border-border text-center">
          <Usb className="w-8 h-8 mx-auto mb-3" />

          <h2 className="font-black text-xl">USB OTG Connection</h2>

          <p className="text-sm text-muted-foreground mt-2">
            Status:{" "}
            <span className="font-bold">
              {state.connecting
                ? "Connecting..."
                : state.connected
                  ? "Connected"
                  : "Not connected"}
            </span>
          </p>

          {state.device && (
            <p className="text-xs text-muted-foreground mt-2">
              Device ID: {state.device.deviceId} • VID: {state.device.vendorId}{" "}
              • PID: {state.device.productId}
            </p>
          )}
        </div>

        <button
          onClick={scan}
          disabled={state.connecting}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <RefreshCw
            className={`w-5 h-5 ${state.connecting ? "animate-spin" : ""}`}
          />
          Scan USB Devices
        </button>

        {devices.length > 0 && (
          <div className="flex flex-col gap-2">
            {devices.map((device) => (
              <button
                key={device.deviceKey || String(device.deviceId)}
                onClick={() => connect(device)}
                disabled={state.connecting || state.connected}
                className="p-4 rounded-2xl bg-card border-2 border-border text-left disabled:opacity-50"
              >
                <div className="font-bold flex items-center gap-2">
                  <PlugZap className="w-4 h-4" />
                  {device.deviceName || "USB Device"}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  Device ID: {device.deviceId} • VID: {device.vendorId} • PID:{" "}
                  {device.productId}
                </div>

                {device.deviceKey && (
                  <div className="text-[10px] text-muted-foreground mt-1 break-all">
                    Key: {device.deviceKey}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {state.connected && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={sendTest}
              className="py-3 rounded-2xl bg-secondary font-bold flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>

            <button
              onClick={read}
              className="py-3 rounded-2xl bg-secondary font-bold"
            >
              Read
            </button>

            <button
              onClick={disconnect}
              className="py-3 rounded-2xl bg-destructive text-white font-bold flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Close
            </button>
          </div>
        )}

        {state.connected && (
          <div className="flex gap-2">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendCommand();
              }}
              className="flex-1 px-3 py-3 rounded-xl border-2 border-border bg-card"
              placeholder="Type command..."
            />

            <button
              onClick={sendCommand}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold"
            >
              Send
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-black text-green-400 p-4 h-40 overflow-auto text-xs font-mono text-left">
          {terminal.length === 0 ? (
            <div className="opacity-50">No serial data yet...</div>
          ) : (
            terminal.map((line, index) => <div key={index}>{line}</div>)
          )}
        </div>

        <div className="rounded-2xl bg-card border-2 border-border p-4">
          <h3 className="font-bold mb-2">Log</h3>

          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-left">
              {log.map((item, index) => (
                <div key={`${item}-${index}`} className="text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ConnectPage;
