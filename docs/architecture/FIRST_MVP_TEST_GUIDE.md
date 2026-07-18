# First MVP — Test Guide

**Goal:** verify the full Blockly → Arduino upload pipeline on real hardware.

## What is covered by this MVP
- Blockly → Arduino C++ generation
- Real `.hex` build via `arduino-cli` 1.4.1
- Upload via `AvrUploadEngine` → `AvrdudeBackend` (STK500v1/v2)
- Boards: **Uno**, **Nano**, **Mega**

## Automated tests

```bash
npx vitest run src/core/__tests__/pipeline/PipelineService.test.ts
```

Covers, with a `MockUploadEngine` (no hardware needed):

- generate → build → upload success + duration accounting
- stage transitions (`generating → building → uploading → verifying → completed`)
- generation failure → `GenerationFailedError`
- build failure → `BuildFailedError`
- upload failure → `UploadFailedError`
- retry after a transient upload failure

The real build path (`ArduinoCliRealIntegration.test.ts`) exercises the
real `arduino-cli` and is skipped automatically if the tool is absent.

## Manual hardware verification

### Prerequisites
- Android device with the debug APK installed (see build section)
- Arduino Uno / Nano / Mega connected via USB OTG
- Arduino connected in the app (`Connect` screen) — `portKey` is populated

### Procedure
1. Open the app, create a project for the target board.
2. Build one of the required examples:

   - **Blink** — `controls_start` → `pin_mode(13, OUTPUT)`; forever:
     `pin_write(13, HIGH)` → `delay(1000)` → `pin_write(13, LOW)` → `delay(1000)`.
   - **Button** — `pin_mode(2, INPUT)` + `pin_mode(13, OUTPUT)`; forever:
     `if pin_read(2)==HIGH → pin_write(13, HIGH) else pin_write(13, LOW)`.
   - **PWM LED** — `pin_mode(9, OUTPUT)`; forever: `analog_write(9, <value>)`.
   - **Potentiometer** — `pin_mode(A0, INPUT)` + `pin_mode(9, OUTPUT)`;
     forever: `analog_write(9, analog_read(A0) / 4)`.

3. Press **Upload**.
4. Watch the live progress line:
   `Generating → Building → Preparing → Uploading → Verifying → Done`.
5. For Blink, confirm the on-board LED (pin 13) blinks ~1 Hz.

### Required scenarios

| Scenario        | Board | Expected                          |
|-----------------|-------|-----------------------------------|
| Blink           | Uno   | On-board LED blinks               |
| Button          | Uno   | LED follows button state          |
| PWM LED         | Uno   | LED brightness varies             |
| Potentiometer   | Uno   | LED brightness tracks knob        |
| (optional) Blink| Nano  | On-board LED blinks               |
| (optional) Blink| Mega  | On-board LED (pin 13) blinks      |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Connect your Arduino first" | No `portKey` | Use Connect screen; grant USB permission |
| `GENERATION_FAILED` | Invalid blocks / empty workspace | Check the Blocks validate |
| `BUILD_FAILED` (CLI missing) | `arduino-cli` not on device | Phase 14 requires the CLI; ensure it is bundled/available |
| `UPLOAD_FAILED` (port busy) | Serial monitor or other app holds port | Close other connections; retry |
| `UPLOAD_FAILED` (timeout) | Wrong board / bootloader not entering | Re-select correct board; press reset |
| Verification mismatch | Wrong MCU signature | Confirm board matches project.board |

## Build & deploy

```bash
npm run build            # vite build (web bundle)
npx cap sync android     # sync native project
npm run android:debug    # assemble debug APK (capacitor preset)
```

Install the resulting APK on the device and run the manual procedure above.
