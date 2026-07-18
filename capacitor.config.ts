import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.roboticsonphone.app",
  appName: "NewBegin Makes",
  webDir: "dist",
  server: {
    androidScheme: "http",
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
