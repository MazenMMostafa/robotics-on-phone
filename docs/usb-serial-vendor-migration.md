# Follow-up Task: Vendor & Migrate `capacitor-usb-serial` to Capacitor 8

Status: PENDING
Priority: HIGH
Owner: TBD
Related: USB serial dependency conflict (peer `@capacitor/core ^6.0.0` vs app `@capacitor/core ^8.3.1`)

## Context

- App uses `@capacitor/core` / `@capacitor/android` **8.3.1**.
- `capacitor-usb-serial@1.0.3` (latest, published 2026-06-13) declares peer
  `@capacitor/core ^6.0.0` and is **unmaintained** (only versions 1.0.0–1.0.3 exist;
  no Capacitor 8 release planned).
- The plugin's **implementation is Cap 8 compatible**: it uses only the stable plugin
  API (`Plugin`, `PluginCall`, `PluginMethod`, `@CapacitorPlugin`, `JSObject`, `JSArray`)
  and delegates serial I/O to `com.hoho.android.usbserial`. No v6-only APIs are used.
- The **only** real issue is the peer-dependency declaration (breaks `npm install`)
  plus a Gradle `compileSdk 34` / `targetSdkVersion 34` that lags the app's 36.
- A temporary `overrides` entry in `package.json` currently unblocks `npm install`.
  This is a dev-only stopgap and must NOT remain the long-term solution.

## Goal

Replace the unmaintained npm dependency with a **vendored/forked copy inside this repo**,
officially migrated to Capacitor 8, so the app does not depend long-term on a plugin
with incorrect peer deps.

### Hard constraints

- **Do NOT change the JavaScript API exposed to the application.**
- **Keep `src/platform/capacitor/CapacitorUsbAdapter.ts` unchanged.**
- **Keep `src/core/services/usb/usbSerialExtra.ts` unchanged.**
- Do NOT change the overall app architecture.
- Do NOT use `--force` / `--legacy-peer-deps` for the final resolution.

## Concrete Steps

1. **Vendor the plugin source into the repo**, e.g. `vendor/capacitor-usb-serial/`
   (or a `capacitor-plugins/` dir). Copy:
   - `dist/` (JS bundles + `esm/*.d.ts`)
   - `android/` (Java sources + `build.gradle`)
   - `package.json` (will be edited)

2. **Update the vendored `package.json`:**
   - `peerDependencies.@capacitor/core`: `^6.0.0` → `^8.0.0` (or `^8.3.1`).
   - Keep `name`/`version` (e.g. rename to `@app/capacitor-usb-serial` or keep as-is
     with a local version bump).
   - Ensure `main`/`types`/`capacitor` fields still point at the copied `dist`.

3. **Update vendored `android/build.gradle`:**
   - `compileSdk` / `targetSdkVersion`: `34` → align with app (`rootProject.ext.compileSdkVersion`,
     currently `36`).
   - `sourceCompatibility`/`targetCompatibility`: `VERSION_17` → `VERSION_21` to match app.
   - Keep `implementation project(':capacitor-android')`, `minSdkVersion` (22 is fine).
   - No Java source edits required (`UsbSerial.java` / `UsbSerialPlugin.java` already v8-safe).

4. **Wire the local module into the app:**
   - In root `package.json`, replace the `overrides` block with a local path/file
     dependency, e.g.
     `"capacitor-usb-serial": "file:./vendor/capacitor-usb-serial"`.
   - Remove the `overrides` entry added as the temp dev fix.
   - Ensure `capacitor.config.ts` / `android/capacitor.settings.gradle` still pick up the
     plugin (the plugin's `AndroidManifest`/`CapacitorPlugin` name `UsbSerial` is unchanged).

5. **Verify (no `--force` / `--legacy-peer-deps`):**
   - `npm install` → clean, no `ERESOLVE`.
   - `npx cap sync android` → plugin copied into `android/`.
   - `cd android && ./gradlew assembleDebug` (and `assembleRelease`) → builds.
   - Confirm the JS bridge still registers `UsbSerial` (logcat `Registering plugin instance: UsbSerial`).
   - On-device smoke test: `scan()` / `openConnection()` / `writeBytes()` / `setDTR()`
     against real hardware.

## Acceptance Criteria

- `npm install` succeeds with no peer-dependency conflict and without `--force`/`--legacy-peer-deps`.
- The app builds (debug + release) with the vendored module; no `compileSdk`/`targetSdk` warnings.
- `CapacitorUsbAdapter` and `usbSerialExtra` are byte-for-byte unchanged.
- USB serial runtime behavior is identical to before (same method names, same results).
- The temporary `overrides` entry is removed.

## Notes / Risks

- The vendored copy inherits the plugin's license (check `LICENSE` in the npm package before
  vendoring; preserve it in the repo).
- If upstream later publishes a Cap 8 build, the vendored copy can be deleted and the
  dependency restored — but no such release exists today.
