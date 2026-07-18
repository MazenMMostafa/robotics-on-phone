# Error Handling

## Overview

The error handling system provides centralized, structured error management
for the application. It captures unhandled exceptions and promise rejections,
generates friendly user messages, and provides diagnostic data for developers.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Global Error Sources                     │
│  (window.onerror, unhandledrejection, services,       │
│   extensions, compile, upload)                        │
└──────────┬──────────┬──────────┬────────────────────┘
           │          │          │
┌──────────▼──────────▼──────────▼────────────────────┐
│                  ErrorHandler                         │
│  - handleError(error, type) → ErrorInfo               │
│  - install() / uninstall() global handlers            │
│  - diagnostic handlers                                │
└──────┬──────────────────────┬───────────────────────┘
       │                      │
       ▼                      ▼
┌─────────────┐    ┌──────────────────────┐
│ Notification│    │   EventBus:           │
│  Service     │    │   error:occurred     │
└─────────────┘    └──────────┬───────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Diagnostic GUI    │
                    │  (developer mode)  │
                    └───────────────────┘
```

## Error Types

| Type        | Source                       | User Notification |
|-------------|------------------------------|-------------------|
| unhandled   | window.onerror events        | Yes               |
| rejection   | unhandled promise rejections | Yes               |
| extension   | Extension runtime errors     | Yes               |
| compile     | Code compilation failures    | Yes               |
| upload      | Upload failures              | Yes               |
| general     | Other errors                 | Yes               |

## ErrorHandler (`src/core/services/error/ErrorHandler.ts`)

### Key Methods

- **handleError(error, type)**: Processes an error and returns `ErrorInfo`
- **install()**: Registers `window.onerror` and `window.onunhandledrejection`
- **uninstall()**: Removes global handlers
- **addDiagnosticHandler(handler)**: Registers a handler for developer diagnostics

### ErrorInfo Structure

```typescript
interface ErrorInfo {
  id: string;              // Unique error ID (err-1, err-2, ...)
  type: ErrorType;         // Category of error
  original: unknown;       // Original error object/value
  message: string;         // Extracted message
  stack?: string;          // Stack trace if available
  timestamp: number;       // When the error occurred
  friendlyMessage: string; // User-facing message
}
```

### Friendly Messages

Errors are mapped to friendly messages based on keyword matching:

| Keyword in Error | Friendly Message                                              |
|------------------|---------------------------------------------------------------|
| timeout          | "The operation timed out. Please try again."                  |
| network          | "A network error occurred. Check your connection."            |
| compile          | "Failed to compile the code. Check your blocks."              |
| upload           | "Upload failed. Check the board connection."                  |
| usb              | "USB connection lost. Please reconnect the board."            |
| extension        | "An extension encountered an error."                          |
| (fallback)       | "An unexpected error occurred."                               |

## Data Flow

1. An error occurs (unhandled exception, rejection, or explicit call)
2. `ErrorHandler.handleError()` builds an `ErrorInfo` with friendly message
3. The error is logged via `LoggerService`
4. Diagnostic handlers are called
5. `EventBus` emits `error:occurred`
6. For non-fatal errors, a notification is shown via `NotificationService`
7. In developer mode, a diagnostic panel can display the full error details
