# Architecture Plan — NewBegin Makes

---

## Current Architecture

### Overview

The application is a **monolithic SPA** with a simple page-based routing approach (no React Router). All state lives in individual `useState` hooks, prop-drilled down to child components. Business logic is tightly coupled to UI. The Blockly integration is a single 1,494-line file responsible for workspace setup, block registration, code generation, and toolbox configuration.

### Diagram (Current)

```
App.tsx  (router + state owner)
  ├── spa/HomePage.tsx
  ├── spa/NewProjectPage.tsx     ← imports lib/projects.ts, lib/blocks.ts
  ├── spa/ProjectsPage.tsx       ← imports lib/projects.ts, lib/blocks.ts
  ├── spa/EditorPage.tsx         ← imports 4 lib files + BlocklyWorkspace
  │     └── components/BlocklyWorkspace.tsx  ← 1494 lines, does EVERYTHING
  ├── spa/ConnectPage.tsx        ← imports lib/UsbConnection.ts
  └── spa/HelpPage.tsx

lib/   ← mixed utilities, business logic, and stateful services
  ├── projects.ts     ← CRUD + React hook (state management + persistence)
  ├── blocks.ts       ← static block definitions (most code is unused)
  ├── UsbConnection.ts ← singleton class (stateful service)
  ├── stk500Uploader.ts ← procedural upload logic (depends on UsbConnection)
  ├── arduinoCompile.ts  ← network client (hardcoded URL)
  ├── usbSerialExtra.ts  ← type augmentation
  └── utils.ts        ← Tailwind utility
```

### Problems

1. **No separation of concerns.** Business logic, state management, UI, and side effects are interleaved. `BlocklyWorkspace.tsx` handles workspace setup, block registration, code generation, toolbox building, UI state, and event wiring in one file.

2. **God component.** `BlocklyWorkspace.tsx` at 1,494 lines violates every principle of maintainability. It cannot be tested, reasoned about, or extended without risk.

3. **No state management.** All state is local `useState`. The USB service is a singleton class that manages its own state and notifies via a custom subscribe pattern. Projects are managed through a mix of React hooks and raw localStorage. No centralized state means UI inconsistencies and prop-drilling.

4. **Hardcoded configuration.** Compile server URL, board definitions, baud rates, pin options — all hardcoded. Adding a new board requires editing source code.

5. **Unused/dead code.** The `CATEGORIES` array in `blocks.ts` (236 lines) and the `Block.tsx` component are not used by the actual Blockly workspace (which builds its own toolbox). This is confusing and misleading.

6. **Global scope pollution.** Code generation uses `window._setupCode`, `window._loopCode`, etc. — shared mutable globals that could collide and are untestable.

7. **No testability.** Business logic is embedded in UI components. The services that could be tested (`UsbConnection`, `stk500Uploader`) have hard dependencies on Capacitor plugins that can't be mocked without significant effort.

8. **No error boundaries.** A crash in any component takes down the entire app.

9. **Unbounded arrays.** The terminal and logs arrays in `UsbConnection.ts` grow without limit.

10. **Mixed concerns in `lib/`**. The `lib/` folder contains React hooks, static data, network clients, stateful services, and utility functions with no clear organization.

---

## Proposed Architecture

### Principles

1. **Feature-based organization.** Every feature is a self-contained module with its own components, hooks, stores, types, and tests.

2. **Layered architecture.** Each layer has a single responsibility and depends only on layers below it.

3. **Data-driven configuration.** Boards, components, blocks, and examples are defined in JSON. Adding a new board requires zero code changes.

4. **Plugin-based blocks.** Each block is an independent module that self-registers. No giant switch statements or monolithic registration files.

5. **Centralized state.** Zustand stores provide predictable state management without prop-drilling.

6. **Service layer.** All I/O (USB, serial, network, localStorage) goes through injectable services that can be mocked in tests.

7. **Small files.** No file exceeds 200 lines. Every module has one responsibility.

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UI Layer (Components)                        │
│  Pages: HomePage | EditorPage | ProjectsPage | ConnectPage | ...    │
│  Shared: Button | Card | Modal | Terminal | CodeViewer | ...        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ hooks + Zustand selectors
┌───────────────────────────┴─────────────────────────────────────────┐
│                     State Layer (Zustand Stores)                     │
│  projectStore  blocklyStore  usbStore  compileStore  settingsStore  │
│  themeStore  editorStore  uiStore                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ actions
┌───────────────────────────┴─────────────────────────────────────────┐
│                    Service Layer (Pure Logic)                        │
│  usbService  serialMonitor  compileClient  projectPersistence        │
│  boardService  componentService  exampleService  blockRegistry       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ calls
┌───────────────────────────┴─────────────────────────────────────────┐
│                  Infrastructure Layer (Drivers)                      │
│  capacitor-usb-serial  localStorage  fetch  arduino-cli  Blockly     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
React Component (calls hook or Zustand action)
    │
    ▼
Zustand Store Action (validates, orchestrates)
    │
    ▼
Service Layer (business logic, I/O)
    │
    ▼
Infrastructure (Capacitor plugin, fetch, localStorage, Blockly API)
    │
    ▼
Callback / Promise resolves → Store updates → React re-renders
```

---

## Folder Structure (Proposed)

```
src/
├── app/
│   ├── App.tsx                      # Root component, router
│   ├── ErrorBoundary.tsx            # Global error boundary
│   ├── routes.ts                    # Page configuration
│   └── providers.tsx                # Store providers, theme provider
│
├── core/
│   ├── types/
│   │   ├── board.ts                 # Board type definitions
│   │   ├── component.ts             # Component type definitions
│   │   ├── block.ts                 # Block type definitions
│   │   ├── project.ts               # Project type definitions
│   │   ├── usb.ts                   # USB/device type definitions
│   │   └── settings.ts              # Settings type definitions
│   │
│   ├── services/
│   │   ├── usb/
│   │   │   ├── UsbService.ts        # USB connection management
│   │   │   ├── UsbService.interface.ts  # Injectable interface
│   │   │   └── __tests__/
│   │   │
│   │   ├── compiler/
│   │   │   ├── CompileClient.ts     # Network client for compile server
│   │   │   ├── CompileClient.interface.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── project/
│   │   │   ├── ProjectRepository.ts # localStorage persistence
│   │   │   └── __tests__/
│   │   │
│   │   ├── board/
│   │   │   ├── BoardService.ts      # Board manager (JSON-driven)
│   │   │   └── __tests__/
│   │   │
│   │   ├── component/
│   │   │   ├── ComponentService.ts  # Component manager
│   │   │   └── __tests__/
│   │   │
│   │   ├── settings/
│   │   │   └── SettingsRepository.ts # localStorage settings
│   │   │
│   │   └── stk500/
│   │       ├── Stk500Uploader.ts    # STK500v1 protocol
│   │       └── __tests__/
│   │
│   └── utils/
│       ├── cn.ts                    # Tailwind class merge
│       ├── id.ts                    # ID generator
│       └── debounce.ts              # Debounce utility
│
├── features/
│   ├── blockly/
│   │   ├── store/
│   │   │   └── blocklyStore.ts      # Zustand store
│   │   │
│   │   ├── workspace/
│   │   │   ├── BlocklyWorkspace.tsx  # Workspace container (thin)
│   │   │   ├── useWorkspace.ts       # Hook: init, dispose, resize
│   │   │   └── toolbox.ts           # Toolbox builder
│   │   │
│   │   ├── blocks/
│   │   │   ├── registry.ts          # Block auto-registration
│   │   │   ├── types.ts             # Block metadata types
│   │   │   │
│   │   │   ├── events/
│   │   │   │   ├── whenStart.ts     # Arduino starts
│   │   │   │   ├── forever.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── control/
│   │   │   │   ├── wait.ts
│   │   │   │   ├── ifElse.ts
│   │   │   │   ├── repeat.ts
│   │   │   │   ├── forever.ts
│   │   │   │   ├── while.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── operators/
│   │   │   │   ├── math.ts
│   │   │   │   ├── logic.ts
│   │   │   │   ├── text.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── variables/
│   │   │   │   ├── set.ts
│   │   │   │   ├── get.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── functions/
│   │   │   │   ├── procedure.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── arduino/
│   │   │   │   ├── digitalWrite.ts
│   │   │   │   ├── digitalRead.ts
│   │   │   │   ├── analogWrite.ts
│   │   │   │   ├── analogRead.ts
│   │   │   │   ├── tone.ts
│   │   │   │   ├── serial.ts
│   │   │   │   ├── pwm.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── display/
│   │   │   │   ├── lcd16x2.ts
│   │   │   │   ├── lcdI2c.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── communication/
│   │   │   │   ├── bluetooth.ts
│   │   │   │   ├── wifi.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── sensor/
│   │   │   │   ├── ultrasonic.ts
│   │   │   │   ├── dht.ts
│   │   │   │   ├── pir.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── motor/
│   │   │   │   ├── dcMotor.ts
│   │   │   │   ├── servo.ts
│   │   │   │   ├── relay.ts
│   │   │   │   ├── bldc.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── ai/                  # Future: speech, vision, camera
│   │   │
│   │   ├── generators/
│   │   │   ├── types.ts             # Generator type definitions
│   │   │   ├── cppGenerator.ts      # Master generator orchestration
│   │   │   └── helpers/
│   │   │       ├── deduplicate.ts   # Remove duplicate includes/vars
│   │   │       └── uniqueLines.ts
│   │   │
│   │   └── theme/
│   │       ├── blockColors.ts       # Color definitions per category
│   │       └── categoryStyles.ts    # Category visual styling
│   │
│   ├── projects/
│   │   ├── store/
│   │   │   └── projectStore.ts      # Zustand store
│   │   ├── hooks/
│   │   │   └── useProjects.ts       # Thin wrapper over store
│   │   ├── pages/
│   │   │   ├── ProjectsPage.tsx
│   │   │   └── NewProjectPage.tsx
│   │   ├── components/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   └── BoardSelector.tsx
│   │   └── __tests__/
│   │
│   ├── editor/
│   │   ├── store/
│   │   │   └── editorStore.ts
│   │   ├── pages/
│   │   │   └── EditorPage.tsx
│   │   ├── components/
│   │   │   ├── EditorToolbar.tsx
│   │   │   ├── CodeModal.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   └── UploadButton.tsx
│   │   └── __tests__/
│   │
│   ├── connect/
│   │   ├── store/
│   │   │   └── usbStore.ts
│   │   ├── pages/
│   │   │   └── ConnectPage.tsx
│   │   ├── components/
│   │   │   ├── DeviceList.tsx
│   │   │   ├── ConnectionStatus.tsx
│   │   │   ├── SerialTerminal.tsx
│   │   │   └── SerialLog.tsx
│   │   └── __tests__/
│   │
│   ├── settings/
│   │   ├── store/
│   │   │   └── settingsStore.ts
│   │   ├── pages/
│   │   │   └── SettingsPage.tsx
│   │   ├── components/
│   │   │   ├── ServerConfig.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   ├── UploadConfig.tsx
│   │   │   └── LanguageSelector.tsx
│   │   └── __tests__/
│   │
│   ├── home/
│   │   ├── pages/
│   │   │   └── HomePage.tsx
│   │   └── components/
│   │       └── QuickActions.tsx
│   │
│   ├── help/
│   │   ├── pages/
│   │   │   └── HelpPage.tsx
│   │   └── components/
│   │       └── TutorialCard.tsx
│   │
│   ├── examples/
│   │   ├── store/
│   │   │   └── exampleStore.ts
│   │   ├── pages/
│   │   │   └── ExamplesPage.tsx
│   │   ├── components/
│   │   │   ├── ExampleCard.tsx
│   │   │   └── ExampleList.tsx
│   │   ├── data/
│   │   │   ├── index.ts            # Dynamic loader
│   │   │   └── examples/           # JSON files
│   │   │       ├── blink.json
│   │   │       ├── servo.json
│   │   │       ├── lcd.json
│   │   │       └── ...
│   │   └── __tests__/
│   │
│   └── theme/
│       ├── store/
│       │   └── themeStore.ts
│       ├── components/
│       │   ├── ThemeProvider.tsx
│       │   └── ThemeToggle.tsx
│       └── colors.ts               # Color palette
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── CodeBlock.tsx
│   │   └── layout/
│   │       ├── PageShell.tsx       # Consistent page wrapper
│   │       ├── BottomNav.tsx       # Bottom navigation bar
│   │       └── TopBar.tsx          # Optional top bar
│   │
│   └── hooks/
│       ├── useIsMobile.ts
│       └── useDebounce.ts
│
├── data/
│   ├── boards/
│   │   ├── uno.json
│   │   ├── nano.json
│   │   ├── mega.json
│   │   ├── esp32.json
│   │   ├── esp8266.json
│   │   └── pico.json
│   │
│   └── components/
│       ├── servo.json
│       ├── lcd16x2.json
│       ├── lcdI2c.json
│       ├── dcMotor.json
│       ├── relay.json
│       ├── dht11.json
│       ├── ultrasonic.json
│       ├── pir.json
│       ├── button.json
│       ├── rgbLed.json
│       ├── bldcMotor.json
│       ├── oled.json
│       ├── neopixel.json
│       ├── stepper.json
│       ├── rfid.json
│       ├── bmp280.json
│       └── ...
│
└── styles/
    ├── globals.css                 # Tailwind directives + CSS vars
    ├── blockly.css                 # Blockly-specific overrides
    └── themes/
        ├── light.css
        └── dark.css
```

### Board JSON Schema (example: `uno.json`)

```json
{
  "id": "uno",
  "name": "Arduino Uno",
  "tagline": "The classic starter board",
  "emoji": "🔵",
  "fqbn": "arduino:avr:uno",
  "uploadProtocol": "stk500v1",
  "defaultBaudRate": 115200,
  "baudRates": [9600, 57600, 115200],
  "pins": {
    "digital": [
      {"pin": 0, "name": "RX", "pwm": false},
      {"pin": 1, "name": "TX", "pwm": false},
      {"pin": 2, "pwm": false},
      {"pin": 3, "pwm": true},
      {"pin": 4, "pwm": false},
      {"pin": 5, "pwm": true},
      {"pin": 6, "pwm": true},
      {"pin": 7, "pwm": false},
      {"pin": 8, "pwm": false},
      {"pin": 9, "pwm": true},
      {"pin": 10, "pwm": true},
      {"pin": 11, "pwm": true},
      {"pin": 12, "pwm": false},
      {"pin": 13, "pwm": false, "builtinLed": true}
    ],
    "analog": [
      {"pin": "A0"},
      {"pin": "A1"},
      {"pin": "A2"},
      {"pin": "A3"},
      {"pin": "A4", "sda": true},
      {"pin": "A5", "scl": true}
    ]
  },
  "interfaces": {
    "uart": [{"rx": 0, "tx": 1}],
    "i2c": [{"sda": "A4", "scl": "A5"}],
    "spi": [{"mosi": 11, "miso": 12, "sck": 13, "ss": 10}]
  },
  "supportedComponents": [
    "servo", "lcd16x2", "dcMotor", "relay", "dht11",
    "ultrasonic", "pir", "button", "rgbLed", "bldcMotor"
  ],
  "libraries": [],
  "voltage": "5V",
  "clockSpeed": 16000000,
  "flashSize": 32256,
  "ramSize": 2048
}
```

### Component JSON Schema (example: `dht11.json`)

```json
{
  "id": "dht11",
  "name": "DHT11 Temperature & Humidity",
  "description": "Digital temperature and humidity sensor",
  "category": "sensor",
  "supportedBoards": ["uno", "nano", "esp32", "mega"],
  "pins": {
    "required": [{"key": "PIN", "label": "Data pin"}],
    "optional": []
  },
  "libraries": ["DHT.h"],
  "blocks": [
    {
      "type": "rb_dht_read",
      "message0": "get %1 from DHT sensor at pin %2",
      "args": [
        {
          "type": "field_dropdown",
          "name": "READING",
          "options": [
            ["temperature", "temperature"],
            ["humidity", "humidity"]
          ]
        },
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": "digitalPins"
        }
      ],
      "output": "Number",
      "colour": "SENSORS"
    }
  ],
  "generator": {
    "includes": ["#include <DHT.h>"],
    "globals": "DHT dht_${PIN}(${PIN}, DHT11);",
    "setup": "dht_${PIN}.begin();",
    "code": {
      "temperature": "dht_${PIN}.readTemperature()",
      "humidity": "dht_${PIN}.readHumidity()"
    }
  },
  "example": {
    "title": "DHT11 Temperature Monitor",
    "description": "Read temperature and humidity from DHT11 sensor",
    "difficulty": "beginner"
  }
}
```

---

## State Management (Zustand Stores)

### Store Map

| Store | Key State | Actions | Persistence |
|-------|-----------|---------|-------------|
| `projectStore` | projects[], selectedId | create, update, remove, duplicate | localStorage |
| `blocklyStore` | workspace, toolbox, blocks | init, dispose, setToolbox | none |
| `usbStore` | devices[], connected, connecting, terminal[], logs[] | scan, connect, disconnect, send, startReading, stopReading | none |
| `compileStore` | status, hex, error | compile, reset | none |
| `settingsStore` | serverUrl, theme, language, autoSave, uploadSpeed | setServerUrl, setTheme, setLanguage, etc. | localStorage |
| `themeStore` | mode (light/dark) | toggle, setMode | localStorage/prefers-color-scheme |
| `editorStore` | showCodeModal, showSettings, generatedCode, copyStatus | openCodeModal, closeCodeModal, setGeneratedCode | none |
| `uiStore` | sidebarOpen, activePage, toasts | setActivePage, addToast, dismissToast | none |

### Store Pattern

```typescript
// Example: projectStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectStore {
  projects: Project[];
  selectedId: string | null;
  create: (name: string, board: BoardType) => Project;
  update: (id: string, patch: Partial<Project>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  select: (id: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedId: null,
      create: (name, board) => {
        const project = { id: generateId(), name, board, ... };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },
      // ...
    }),
    { name: 'NewBeginMakes.projects.v2' }
  )
);
```

---

## Dependency Graph (Proposed)

```
shared/components/ui/*     ← no dependencies on features
shared/hooks/*              ← no dependencies on features
core/types/*                ← no dependencies (pure types)
core/services/*             ← depends on core/types, infrastructure
core/utils/*                ← no dependencies
features/*/store/*          ← depends on core/services, core/types
features/*/components/*     ← depends on feature store, shared/ui
features/*/pages/*          ← depends on feature components, app/routes
app/App.tsx                 ← imports all pages, shared/layout, providers
```

Rules:
- `core/` never imports from `features/`
- `shared/` never imports from `features/` or `core/`
- `features/` can import from `core/` and `shared/`
- Features never import from other features (except through stores)
- `app/` imports everything (composition root)

---

## Migration Plan

### Strategy: Parallel Run

The old and new architecture coexist during migration. The `App.tsx` router maps old pages to new implementations incrementally. Each feature is migrated independently.

### Phase 1: Architecture Plan & Foundation (current phase)

**What:** Create ARCHITECTURE_PLAN.md, set up folder structure, install Zustand, create core types and services.

**Why:** Establish foundation before migrating any feature.

**Files changed:** New files only — `ARCHITECTURE_PLAN.md`, `core/types/*`, `core/utils/*`, `package.json` (add Zustand).

**Build status:** ✅ Must pass

---

### Phase 2: Project Structure

**What:** Create the `core/`, `features/`, `shared/`, `data/`, `app/` directories. Move existing code into the new structure without changing its behavior. Old files remain as wrappers.

**Why:** Immediate payoff: clear organization. Every future change is placed in the correct location.

**Risks:** Import paths change — must update every import.

**Migration strategy per file:**

1. Create new file in target location
2. Copy existing code
3. Update imports
4. Create re-export from old path (backward compat)
5. Remove old file after all consumers migrate

**Files changed:** 19 source files moved, all imports updated.

**Build status:** ✅ Must pass

---

### Phase 3: State Management

**What:** Create Zustand stores. Wrap existing singleton services. Replace `useState` chains with store selectors.

**Why:** Eliminate prop drilling. Enable testing. Centralize state.

**Risks:** Stores must match existing behavior exactly. Race conditions during transition.

**Files changed:** ~15 new store files (Zustand), ~6 existing files refactored.

**Build status:** ✅ Must pass

---

### Phase 4: Blockly Refactor

**What:** Split `BlocklyWorkspace.tsx` into:
- `features/blockly/workspace/` (workspace management)
- `features/blockly/blocks/*/` (individual block definitions)
- `features/blockly/generators/` (code generation)
- `features/blockly/theme/` (colors and styling)

**Why:** The 1494-line file is the biggest maintainability risk.

**Risks:** Block registration order, generator state (`window._*` globals) must be replicated exactly.

**Files changed:** 1 file broken into ~40 small files. Block definitions extracted.

**Build status:** ✅ Must pass

---

### Phase 5: Data-Driven Boards & Components

**What:** Create `data/boards/*.json` and `data/components/*.json`. Build BoardService and ComponentService.

**Why:** Adding a new board or component becomes a JSON file drop — no code changes.

**Risks:** JSON schema must be comprehensive enough for all boards/components.

**Files changed:** ~30 new JSON files, 5 new service files, 2 existing files refactored.

**Build status:** ✅ Must pass

---

### Phase 6: Plugin-Based Block Library

**What:** Each block becomes a self-registering module. Remove monolithic registration.

**Why:** Adding a new block requires only creating one file in the right directory.

**Risks:** Auto-registration must not break existing blocks.

**Files changed:** 29 block definition files created, `registry.ts` created, `BlocklyWorkspace.tsx` simplified.

**Build status:** ✅ Must pass

---

### Phase 7: Board Manager

**What:** UI for browsing/installing boards. Boards load from `data/boards/` dynamically.

**Why:** Users can add new boards without an app update.

**Files changed:** New page + components + store.

**Build status:** ✅ Must pass

---

### Phase 8: Component System

**What:** Component Manager UI. Components load from `data/components/`. Blocks auto-generate from component definitions.

**Why:** Zero-code component addition for Arduino ecosystem.

**Files changed:** New page + components + store.

**Build status:** ✅ Must pass

---

### Phase 9: Example System

**What:** Load examples from `data/examples/*.json`. Browse, search, load into editor.

**Why:** Give beginners a library of ready-to-run projects.

**Files changed:** ~20 JSON example files, new page + components + store.

**Build status:** ✅ Must pass

---

### Phase 10: Settings Page

**What:** UI for all configurable settings. Persist to localStorage.

**Why:** No more hardcoded configuration. Server URL, theme, language, upload speed all configurable.

**Files changed:** New page + components + store + settings repository.

**Build status:** ✅ Must pass

---

### Phase 11-16: USB Improvements, Compiler Service, UI Redesign, Performance, Testing, Documentation

**What:** Subsequent phases as outlined in the project requirements.

**Why:** Continuous improvement toward production quality.

**Build status:** ✅ Must pass after each phase.

---

## Expected Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Largest file | 1,494 lines (BlocklyWorkspace.tsx) | < 150 lines per file |
| Number of source files | 19 | ~100+ (small, focused) |
| State management | `useState` + prop drilling | Zustand stores with selectors |
| Block registration | Monolithic loop over 29 block defs | Each block self-registers |
| Board definitions | Hardcoded in TypeScript | JSON files, zero-code addition |
| Component definitions | Embedded in generators | JSON files, zero-code addition |
| Code generation | `window._*` globals | Pure functions with deduplication |
| Compile server URL | Hardcoded `192.168.2.11:8787` | Configurable via settings |
| Unbounded arrays | Logs + terminal grow forever | Capped arrays with configurable limit |
| Error handling | None (uncaught crashes) | Error boundaries, typed errors |
| Testability | Near zero (UI-coupled logic) | Services testable with mocks |
| TypeScript coverage | Partial types, `any` in places | Strict types throughout |
| Dead code | `blocks.ts` CATEGORIES, `Block.tsx` | Removed |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing functionality during migration | Medium | High | Parallel run: old code works alongside new; no feature removal |
| Blockly API changes between versions | Low | High | Pin Blockly version in package.json |
| Zustand learning curve for contributors | Medium | Low | Small stores, documented patterns |
| JSON schema not covering all board types | Medium | Medium | Iterative schema design; TypeScript validation |
| Performance regression from store subscriptions | Low | Medium | Zustand selectors prevent unnecessary re-renders |
| Migration takes too long | Medium | Medium | Phase-by-phase with explicit stop conditions |
| Capacitor plugin incompatibility | Low | High | Test every phase with APK build |
