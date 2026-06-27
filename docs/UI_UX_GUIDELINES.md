# UI / UX Guidelines

## Goal

The application should provide the best mobile experience for programming Arduino using Blockly.

The interface should feel modern, responsive, and intuitive for beginners while remaining powerful enough for advanced users.

The overall design quality should surpass PictoBlox in terms of usability, consistency, and visual polish.

---

# Design Language

Use Google Material Design 3 as the foundation.

Combine ideas from:

- Material Design 3
- Figma
- Linear
- Notion
- VS Code
- Android Studio

The interface must never feel cluttered.

Every screen should have a clear hierarchy.

---

# Color Palette

Primary:
Blue

Secondary:
Cyan

Success:
Green

Warning:
Orange

Danger:
Red

Background:
Very light gray (Light Mode)
Dark gray (#121212) in Dark Mode.

---

# Typography

Use modern readable fonts.

Large headings.

Medium body text.

Clear hierarchy.

Avoid tiny buttons.

---

# Navigation

Bottom Navigation

Home

Projects

Editor

Devices

Settings

The user should never be more than two taps away from the editor.

---

# Editor Layout

The Blockly workspace occupies most of the screen.

Floating action buttons should be minimized.

The toolbox should slide smoothly.

Allow pinch-to-zoom.

Support landscape mode.

Support drag-and-drop with touch.

---

# Blockly UX

Large touch targets.

Smooth dragging.

Magnetic snapping.

Animated block insertion.

Block collapsing.

Search inside toolbox.

Favorites category.

Recent blocks.

Custom categories.

---

# Animations

Fast.

Smooth.

60 FPS whenever possible.

Avoid unnecessary animations.

Use subtle transitions.

---

# Device Manager

Easy USB detection.

Large Connect button.

Live connection status.

Board icon.

Port information.

Auto reconnect.

---

# Upload Experience

One-click upload.

Progress bar.

Compilation logs.

Upload logs.

Retry button.

Cancel button.

Clear success/error messages.

---

# Serial Monitor

Terminal style.

Timestamp support.

Auto scroll.

Pause.

Save log.

Clear log.

Send commands.

---

# Accessibility

High contrast.

Large touch targets.

Responsive text.

Screen rotation support.

Dark mode.

Light mode.

---

# Performance

Instant navigation.

No unnecessary loading screens.

Lazy loading.

No UI freezes.

---

# Error Handling

Friendly messages.

Never expose stack traces.

Explain errors in beginner-friendly language.

Provide suggested fixes whenever possible.

---

# Quality Requirements

Every new screen must:

- Follow Material 3.
- Support phones first.
- Support dark mode.
- Be fully responsive.
- Match the overall design language.
- Reuse existing UI components whenever possible.
