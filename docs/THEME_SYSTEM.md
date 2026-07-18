# Theme System

## Overview

The ThemeService manages the application's visual theme with support for Light,
Dark, and System (follow OS preference) modes. It uses CSS custom properties
for styling and the EventBus for change notifications.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   UI Components                       │
│  (useThemeStore hook subscribes to theme changes)     │
└──────────────────┬──────────────────────────────────┘
                   │ EventBus: theme:changed
┌──────────────────▼──────────────────────────────────┐
│                ThemeService                           │
│  - setMode(mode)                                      │
│  - getMode() / getCurrentTheme()                      │
│  - CSS class toggling (document.documentElement)      │
│  - MediaQueryList listener for system preference      │
└──────────────────┬──────────────────────────────────┘
                   │ reads
┌──────────────────▼──────────────────────────────────┐
│              SettingsManager (theme setting)           │
└─────────────────────────────────────────────────────┘
```

## ThemeService (`src/core/services/theme/ThemeService.ts`)

### Modes

- **`light`**: Always light theme
- **`dark`**: Always dark theme
- **`system`**: Follows OS preference via `prefers-color-scheme` media query

### Behavior

On init, the service registers a `change` listener on the `matchMedia`
query. When the OS theme changes and mode is `system`, the theme updates
automatically.

Theme changes are applied by toggling `light`/`dark` CSS classes on
`document.documentElement`. The existing CSS custom properties in
`globals.css` respond to these classes.

### CSS Variables

The theme uses CSS custom properties (not Tailwind dark: prefix) for
dynamic theming:

```css
:root { /* light theme variables */ }
@media (prefers-color-scheme: dark) { :root { /* dark via OS */ } }
.dark { /* explicit dark overrides */ }
```

## UI Integration

The `useThemeStore` provides `mode` and `theme` to React components.
Setting a new mode is done through `ThemeService.setMode()` which persists
to `SettingsManager` and immediately updates the DOM.

## Future Custom Themes

The architecture supports custom themes by:
1. Adding new entries to the `ThemeMode` type
2. Defining new CSS class variable sets
3. Toggling the class via the same mechanism
