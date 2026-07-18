# Testing Guide

## Test Runner

We use **Vitest** as the test runner, configured in `vitest.config.ts`. All tests use the `node` environment (no DOM required for core tests).

## Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode for development
npm run test:coverage # Run with coverage report
```

## Test Structure

Tests live in `src/core/__tests__/` and follow the naming convention `*.test.ts`. Each module has a corresponding test file:

| Test File | Tests |
|-----------|-------|
| ServiceContainer.test.ts | DI container (resolve, factory, singleton, circular deps, reset) |
| EventBus.test.ts | Pub-sub (emit, on, once, off, dispose, error handling) |
| BlockRegistry.test.ts | Block registration, Blockly injection |
| GeneratorRegistry.test.ts | Generator registration, generator target injection |
| CategoryRegistry.test.ts | Category registration, merge, lookup |
| ComponentRegistry.test.ts | Component CRUD, filtering, clear |
| LibraryRegistry.test.ts | Library CRUD, headers, board filtering |
| ExampleRegistry.test.ts | Example CRUD, filtering (difficulty, board, tag, extension) |
| AssetRegistry.test.ts | Asset CRUD, data URI, extension cleanup |
| CommandRegistry.test.ts | Command register, lookup, execute, overwrite |
| ExtensionContext.test.ts | Context API (all register methods, events, dispose) |
| ExtensionLoader.test.ts | Dependency checking, API version validation |
| ExtensionManager.test.ts | Lifecycle (init, dispose, deactivate, queries) |
| ValidationRegistry.test.ts | Board/component validation, custom rules |

## Writing Tests

### Basic Pattern

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MyRegistry } from "../path/to/MyRegistry";

describe("MyRegistry", () => {
  beforeEach(() => {
    MyRegistry.clear();
  });

  it("does something", () => {
    MyRegistry.register(someData);
    expect(MyRegistry.getSomething()).toBeDefined();
  });
});
```

### Assertions

Use Vitest's built-in assertion library (compatible with Jest):

```typescript
expect(value).toBe(expected)          // Object.is equality
expect(value).toEqual(expected)        // Deep equality
expect(array).toHaveLength(n)          // Array length
expect(array).toContain(item)          // Array contains
expect(fn).toThrow()                   // Error thrown
expect(value).toBeDefined()            // Not undefined
expect(value).toBeNull()               // Null
expect(value).toBe(true/false)         // Boolean
```

### Async Tests

```typescript
it("async validation", async () => {
  const result = await ValidationRegistry.validate("uno", "led", []);
  expect(result.valid).toBe(false);
});
```

## Mock Adapters

Mock adapters for platform interfaces are in `src/platform/test/`:

| Mock | Interface |
|------|-----------|
| `MockUsbAdapter` | `USBAdapter` |
| `MockStorageAdapter` | `StorageAdapter` |
| `MockCompilerAdapter` | `CompilerAdapter` |

### Using Mock Adapters

```typescript
import { MockUsbAdapter } from "../../platform/test/MockUsbAdapter";

const mockUsb = new MockUsbAdapter();
mockUsb.scanResult = [{ deviceId: 1, vendorId: 0, productId: 0 }];
const devices = await mockUsb.scan();
```

## Coverage

Coverage is collected per-file with individual thresholds:

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory (HTML + lcov).

### Coverage Targets

| Component | Statements | Branches | Functions | Lines |
|-----------|-----------|----------|-----------|-------|
| ServiceContainer | ≥95% | ≥90% | 100% | ≥95% |
| BlockRegistry | 100% | 100% | 100% | 100% |
| GeneratorRegistry | 100% | 100% | 100% | 100% |
| CategoryRegistry | 100% | 100% | 100% | 100% |
| ComponentRegistry | 100% | 100% | 100% | 100% |
| LibraryRegistry | 100% | ≥85% | 100% | 100% |
| ExampleRegistry | 100% | 100% | 100% | 100% |
| AssetRegistry | ≥90% | ≥85% | 100% | ≥90% |
| CommandRegistry | 100% | 100% | 100% | 100% |
| EventBus | ≥95% | ≥90% | 100% | ≥95% |
| ExtensionContext | ≥90% | 100% | ≥85% | ≥90% |
| ExtensionLoader | ≥85% | ≥80% | ≥85% | ≥85% |
| ExtensionManager | ≥80% | ≥75% | ≥80% | ≥80% |
| ValidationRegistry | ≥80% | ≥75% | ≥85% | ≥80% |

## Best Practices

1. **Reset state** in `beforeEach` — all registries have a `clear()` method
2. **Test edge cases** — empty states, duplicates, unknown lookups, error paths
3. **Don't test implementation details** — test the public API behavior
4. **Use realistic data** — match the shape of production data
5. **One assertion per test** — except when logically grouped
6. **Keep tests fast** — core tests should run in <2 seconds
7. **Don't import Capacitor modules** — use mock adapters in tests

## CI Checks

The `npm run verify` command runs the full quality gate:

1. TypeScript type checking (`tsc -b --noEmit`)
2. ESLint (`eslint .`)
3. All tests with coverage (`vitest run --coverage`)
4. Production build (`vite build`)
