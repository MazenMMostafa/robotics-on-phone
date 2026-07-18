# PROJECT STATUS — NewBegin Makes

## IMPORTANT DISCLAIMER

This project is **NOT a Flutter project**. It is a **Capacitor-wrapped web application** built with:

- **React 19** + **TypeScript** + **Vite**
- **Google Blockly 12** for visual block programming
- **Tailwind CSS** for styling
- **Capacitor 8** for native Android deployment
- **capacitor-usb-serial** for USB/OTG communication
- **Express.js** compile server (runs `arduino-cli`)

---

## Overall Progress

**Estimated completion: 15–20%**

Early-stage prototype. Core scaffolding is in place, but most features listed in the spec (MASTER_SPEC.md) remain unimplemented.

---

## Completed Features

- Project CRUD (create, read, update, delete, duplicate)
- LocalStorage persistence for projects
- State-based navigation (6 screens: home, new, projects, editor, connect, help)
- Home page with navigation buttons
- New project page with board selection (Uno, Nano, ESP32)
- Project listing with rename, duplicate, delete
- Blockly workspace integration with 29+custom block types
- Arduino C++ code generation (setup/loop structure, functions, variables, includes, helpers)
- USB OTG connection (scan, connect, disconnect, send/receive, DTR toggle)
- STK500v1 protocol uploader (for Arduino Uno/Nano)
- Serial terminal display (read loop with buffer)
- Compile server (Express + arduino-cli on Windows)
- Light/dark mode CSS theme
- Android APK building (debug + release signed)
- Capacitor Android project with USB serial plugin

---

## Partially Completed Features

### Blockly Block Categories (~20% complete)
Only a subset of blocks from BLOCKS_SPEC.md are implemented.
- **Events**: `rb_when_start` is the only event block
- **Control**: Basic blocks present (if, repeat, forever, wait, while, stop)
- **Operators**: Math, text, compare blocks present
- **Variables**: Basic variable support present
- **Functions**: Procedure definition and calls present
- **Arduino I/O**: Digital read/write, analog read/write, PWM, tone, serial
- **Sensors**: Ultrasonic, DHT, PIR, button, touch, IR, light, potentiometer, soil moisture
- **Actuators**: DC motor, servo, relay, BLDC motor
- **Display**: LCD 16x2 (parallel + I2C)
- **ESP32**: WiFi connect, Bluetooth begin/send
- **Missing**: Events (broadcast, receive, when button pressed), Lists, Stepper, OLED SSD1306, MAX7219, NeoPixel, Seven Segment, I2C, SPI, UART, MQTT, HTTP, all AI blocks, RTC, SD Card, GPS, BMP280, MPU6050, RFID, etc.

### Arduino Code Generation (~40% complete)
- Generates valid Arduino C++ with setup/loop structure
- Handles includes, globals, variables, helpers
- Duplicate include/variable deduplication
- Missing: interrupt support, advanced library integration, code formatting

### USB Connection (~80% complete)
- Scan, connect, disconnect, send, receive work
- DTR toggle for STK500 reset
- Serial read loop with terminal display
- Missing: auto-detect board, reconnection, progress indicators, robust error recovery

### Arduino Upload (~50% complete)
- STK500v1 protocol implemented for Uno
- Supports 115200 and 57600 baud
- Upload retry on failure for Nano
- Missing: ESP32 upload, progress reporting, cancel support, upload validation

### Serial Monitor (~40% complete)
- Terminal display with read loop
- Send commands
- Missing: auto-scroll toggle, pause, timestamps, save log, clear log

### Compile Server (~70% complete)
- Express server compiles Arduino code via arduino-cli
- Returns HEX for upload
- Missing: proper error messages, ESP32 support, connection status in the UI
- **Bug**: Hardcoded IP address `http://192.168.2.11:8787` in `src/lib/arduinoCompile.ts:8` — will not work on most networks

---

## Missing Features

- Board manager (add/remove boards)
- Library manager (search/install Arduino libraries)
- Example projects (none shipped with app)
- Tutorials (placeholder UI only)
- Project templates
- File explorer
- Code viewer
- ESP32 upload (explicitly blocked with alert)
- ESP8266 support
- Mega/Leonardo/Raspberry Pi Pico support
- Events category (broadcast, receive, when button pressed, timer)
- Lists data type support
- Many sensor blocks (BMP280, IR, PIR, flame, gas, rain, joystick, RFID RC522, MPU6050, compass, GPS, Hall)
- Many display blocks (OLED SSD1306, MAX7219, NeoPixel, seven segment)
- Many actuator blocks (stepper, buzzer, RGB LED, fan, pump)
- Communication blocks (I2C, SPI, UART, HTTP, MQTT, Firebase)
- AI blocks (speech recognition/synthesis, image classification, face detection/recognition, object detection, gesture recognition, camera)
- Cloud sync
- User accounts
- Project sharing
- Plugin/extensions system
- OTA updates
- Accessibility features
- Landscape mode support
- Bottom navigation (currently uses top bar navigation)

---

## Bugs Found

### Bug 1 — Hardcoded Compile Server IP
- **Severity**: High
- **Location**: `src/lib/arduinoCompile.ts:8`
- **Description**: The compile server URL is hardcoded to `http://192.168.2.11:8787`. This is a local network IP that will only work on the developer's specific network.
- **Suggested Fix**: The compile server URL should be configurable — either via a settings screen, environment variable, or auto-discovery.

### Bug 2 — Compile Server Uses Windows-Only Path
- **Severity**: High
- **Location**: `server/index.js:61`
- **Description**: The arduino-cli path is hardcoded to `C:\\arduino-cli\\arduino-cli.exe`, which will not work on macOS or Linux.
- **Suggested Fix**: Use `which arduino-cli` or a configurable path.

### Bug 3 — ESP32 Upload Blocked But No Workaround
- **Severity**: Medium
- **Location**: `src/spa/EditorPage.tsx:142-145`
- **Description**: ESP32 upload shows an alert and returns early. There's no explanation of how ESP32 upload will work or a placeholder mechanism.
- **Suggested Fix**: Either implement ESP32 OTA upload or provide a roadmap item explaining the limitation. Consider adding ESP32-specific upload via WiFi OTA.

### Bug 4 — Compile Server Endpoint Is HTTP (Not HTTPS)
- **Severity**: Medium
- **Location**: `src/lib/arduinoCompile.ts:8`, `server/index.js:99`
- **Description**: The Capacitor config sets `androidScheme: "https"` but the compile server uses plain HTTP. On Android, cleartext traffic is allowed via `usesCleartextTraffic="true"` and `allowMixedContent: true`, but this is a security concern.
- **Suggested Fix**: Add HTTPS support to the compile server or document that cleartext traffic is intentionally allowed.

### Bug 5 — Missing USB Permissions in Android Manifest
- **Severity**: Medium
- **Location**: `android/app/src/main/AndroidManifest.xml`
- **Description**: The manifest has `INTERNET` permission but no USB-related permissions (`USB_PERMISSION`). The capacitor-usb-serial plugin may handle this at runtime, but explicit USB feature declarations are missing.
- **Suggested Fix**: Verify that the capacitor-usb-serial plugin properly declares USB permissions, or add `<uses-feature android:name="android.hardware.usb.host" android:required="false" />`.

### Bug 6 — No Error Recovery in Serial Read Loop
- **Severity**: Low
- **Location**: `src/lib/UsbConnection.ts:214-239`
- **Description**: If the serial read loop encounters a non-timeout error, it sets `this.reading = false` but does not attempt to reconnect or recover. This can leave the app in a disconnected state silently.
- **Suggested Fix**: Add reconnection logic or an automatic retry mechanism.

### Bug 7 — Test Files Reference Wrong Package
- **Severity**: Low
- **Location**: `android/app/src/test/.../ExampleUnitTest.java`, `android/app/src/androidTest/.../ExampleInstrumentedTest.java`
- **Description**: The unit test expects package `com.getcapacitor.app` but the actual application ID is `com.roboticsonphone.app`.
- **Suggested Fix**: Update the test package names and assertions to match the actual application ID.

### Bug 8 — storage Event Listener May Cause Race Condition
- **Severity**: Low
- **Location**: `src/lib/projects.ts:48`
- **Description**: The `storage` event listener syncs projects when localStorage changes from another tab. However, the custom event `NewBeginMakes:projects` is dispatched from `write()` which triggers the same sync, potentially causing double reads.
- **Suggested Fix**: Debounce the sync or check if the data actually changed before updating state.

---

## Architecture Review

### Current Architecture

```
┌──────────────────────────────────────────────┐
│                 React App                      │
│  ┌──────────────┐  ┌──────────────────────┐   │
│  │  App.tsx      │  │  SPA Pages           │   │
│  │  (Router)     │  │  HomePage             │   │
│  │               │  │  NewProjectPage       │   │
│  │               │  │  ProjectsPage         │   │
│  │               │  │  EditorPage           │   │
│  │               │  │  ConnectPage          │   │
│  │               │  │  HelpPage             │   │
│  └──────┬───────┘  └──────────────────────┘   │
│         │                                       │
│  ┌──────┴────────────────────────────────┐      │
│  │  Components                            │      │
│  │  BlocklyWorkspace.tsx  Block.tsx        │      │
│  └──────┬────────────────────────────────┘      │
│         │                                       │
│  ┌──────┴────────────────────────────────┐      │
│  │  Lib / Services                        │      │
│  │  blocks.ts     projects.ts             │      │
│  │  UsbConnection.ts  stk500Uploader.ts    │      │
│  │  arduinoCompile.ts  usbSerialExtra.ts   │      │
│  │  utils.ts                              │      │
│  └────────────────────────────────────────┘      │
│                                                   │
│  ┌──────────────────┐  ┌──────────────┐           │
│  │  hooks/           │  │  styles.css  │           │
│  │  use-mobile.tsx   │  │  Tailwind    │           │
│  └──────────────────┘  └──────────────┘           │
└──────────────────┬───────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │       Capacitor               │
    │  android/ app/                 │
    │  WebView → MainActivity        │
    │  capacitor-usb-serial plugin   │
    └──────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │     Compile Server           │
    │  Express.js + arduino-cli    │
    │  POST /compile → HEX         │
    └──────────────────────────────┘
```

### Strengths

1. **Simple routing**: State-based navigation without a router library keeps dependencies light and straightforward.
2. **Modular service layer**: USB connection, project management, code generation are separated into clear modules.
3. **Custom Blockly integration**: Well-structured custom block definitions with generators that produce valid Arduino C++.
4. **Good theme system**: CSS custom properties with light/dark mode support using `@media (prefers-color-scheme)`.
5. **Mobile-first approach**: The UI is designed for phone-sized screens with touch-friendly targets.
6. **STK500 uploader**: Correct protocol implementation for flashing Arduino Uno/Nano over USB.
7. **ESLint + TypeScript strict mode**: Configured with strict linting rules.

### Weaknesses

1. **No state management library**: All state is managed with React's `useState`. As the app grows, this will lead to prop drilling and component bloat. No Context API or Redux/Zustand is used.
2. **No tests**: Zero JavaScript unit tests or integration tests for the React app.
3. **No React Router**: Custom state-based navigation works for 6 pages but cannot handle deep-linking, back-button properly, or complex routing requirements.
4. **Monolithic BlocklyWorkspace**: At ~1494 lines, this single component handles all Blockly setup, custom blocks, generators, and toolbox configuration. It should be split into smaller files.
5. **Hardcoded configuration**: Server IP, arduino-cli path, baud rate, board definitions are all hardcoded.
6. **No offline compilation**: The compile server is a separate process that must run on a local network. Without it, upload is broken.
7. **No error boundary**: The app has no React error boundary to catch rendering failures gracefully.
8. **Large file sizes**: `BlocklyWorkspace.tsx` (1494 lines) and `EditorPage.tsx` (413 lines) should be refactored.

---

## Technical Debt

### Priority: High

1. **Extract Blockly definitions**: The block definitions, generators, and toolbox config in `BlocklyWorkspace.tsx` should be split into separate files (e.g., `blocks/definitions.ts`, `blocks/generators.ts`, `blocks/toolbox.ts`).
2. **Add state management**: Introduce React Context or Zustand to avoid prop drilling for shared state (USB connection, projects).
3. **Make compile server URL configurable**: Add a settings UI to configure the compile server address.
4. **Add proper error boundaries**: Wrap the app in error boundaries so crashes don't result in white screens.

### Priority: Medium

5. **Remove dead code**: The `CATEGORIES` variable in `src/lib/blocks.ts` (lines 43-232) and the `Block.tsx` component appear unused — the Blockly workspace manages its own toolbox.
6. **Add JavaScript tests**: At minimum, unit tests for USB service, project CRUD, and STK500 uploader.
7. **Replace `any` types**: Several places use `any` or untyped objects (e.g., Blockly JSON init, `WindowWithCode`).
8. **Add proper TypeScript types**: The `Window` augmentation in `BlocklyWorkspace.tsx` pollutes the global scope with `_setupCode`, `_loopCode`, etc.
9. **Fix test package names**: The Android test files reference `com.getcapacitor.app` instead of `com.roboticsonphone.app`.
10. **Clean up commented-out code**: Remove the commented `itemCount_` in `BlocklyWorkspace.tsx:848`.

### Priority: Low

11. **Rename events**: The custom events `NewBeginMakes:projects` in `projects.ts` — already updated.
12. **CSS cleanup**: The `styles.css` has redundant class definitions that overlap with Tailwind utilities.
13. **Add loading skeletons**: Pages load instantly now but will benefit from skeleton loading states as features grow.
14. **Document compile server setup**: No README instructions for setting up the compile server.

---

## Code Quality Score

**Score: 55/100**

### Reasons for score:
- **+20**: Project compiles, builds APK, and runs without crashes
- **+15**: TypeScript strict mode with no type errors
- **+10**: ESLint clean (0 errors)
- **+5**: Modular architecture (services, components, pages are separated)
- **+5**: Theme system with light/dark mode
- **-10**: Zero JavaScript tests
- **-10**: Single 1494-line component (BlocklyWorkspace.tsx)
- **-10**: Global scope pollution via `window._setupCode`, `window._loopCode`, etc.
- **-5**: Unused code (CATEGORIES, Block.tsx component)
- **-5**: Hardcoded configuration values
- **-5**: No state management library
- **-5**: Custom routing instead of React Router
- **-5**: No error boundaries
- **-5**: Test files reference wrong package
- **-5**: Missing TypeScript types in several places

---

## Security Review

### Android Permissions (`AndroidManifest.xml`)
- **INTERNET**: Required for WebView and compile server communication. Reasonable.
- **Missing USB_HOST**: The app relies on capacitor-usb-serial plugin which may request USB permissions at runtime, but there's no explicit `<uses-feature android:name="android.hardware.usb.host"/>` declaration. This means devices without USB host capability could install the app and get broken functionality.
- **usesCleartextTraffic="true"**: Allows HTTP traffic. Necessary for the local compile server but reduces security. Should be scoped with `android:usesCleartextTraffic` removal once HTTPS is supported.

### WebView Security
- The app runs as a Capacitor WebView. The `config.xml` allows `<access origin="*" />` which means all web requests are allowed. This should be restricted.
- The `file_paths.xml` exposes the entire external storage path. This could be a security concern if the app handles sensitive data.

### Storage
- Projects are stored in `localStorage` with key `NewBeginMakes.projects.v1`. No sensitive data is stored.
- No server-side authentication or API keys exposed in the codebase.

### Unsafe Practices
1. **Hardcoded compile server IP** exposed in source code.
2. **No input validation** on USB serial commands — commands are sent directly via the serial protocol.
3. **No CSP headers** in the WebView — Content Security Policy is not configured.
4. **No HTTPS** for compile server communication.

---

## Performance Review

### Startup
- Blockly (a large library) is **dynamically imported** (`await import("blockly")`) — good, avoids blocking initial render.
- No code splitting at page level — all page components are eagerly imported in `App.tsx`.

### Memory
- Projects are stored in localStorage (synchronous, small footprint).
- The serial read loop maintains a growing `terminal` array with no cap — could lead to memory leak over long sessions.
- Blockly workspace objects are disposed on unmount — good.
- **Issue**: `logs` and `terminal` arrays in `UsbConnection.ts` grow unboundedly.

### Rendering
- Tailwind CSS with utility classes — minimal CSS overhead.
- No heavy animations that could degrade performance.
- No virtual scrolling for project list (fine for small lists, will be slow with 100+ projects).

### Large Widgets
- **BlocklyWorkspace** initializes Blockly once on mount with a single `useEffect` — acceptable.
- Blockly's `svgResize` is called on every change listener and window resize — could be throttled.

### Slow Code
- `read()` in `projects.ts` parses JSON every time from localStorage — this is synchronous and fast for small datasets.
- `hexToBytes()` in `stk500Uploader.ts` — runs O(n) on the hex file, acceptable.
- The serial read loop uses a while loop with async/await — not blocking the UI thread, good.

---

## Recommended Next Steps

### Priority 1 (Critical)
1. Fix hardcoded compile server IP — make it user-configurable
2. Fix Android test package names
3. Add compile server setup documentation to README

### Priority 2 (High)
4. Split BlocklyWorkspace.tsx into smaller files
5. Add state management (React Context or Zustand)
6. Cap unbounded log/terminal arrays in UsbConnection.ts
7. Add error boundaries

### Priority 3 (Medium)
8. Remove unused code (CATEGORIES in blocks.ts, Block.tsx)
9. Add USB_HOST feature declaration to Android manifest
10. Add JavaScript unit tests for core services
11. Implement proper pages (help tutorials, settings)

### Priority 4 (Low)
12. Implement missing Blockly categories
13. Add ESP32 upload support
14. Improve serial monitor with timestamps, auto-scroll
15. Add project templates and examples
16. Add landscape mode support
---
