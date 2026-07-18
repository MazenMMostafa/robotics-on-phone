import type { Translations } from "../services/i18n/LanguageManager";

export const en: Translations = {
  // Navigation
  "nav.home": "Home",
  "nav.projects": "Projects",
  "nav.editor": "Editor",
  "nav.connect": "Connect",
  "nav.help": "Help",
  "nav.settings": "Settings",

  // Home
  "home.title": "Robotics on Phone",
  "home.subtitle": "Program Arduino boards from your phone",
  "home.newProject": "New Project",
  "home.openProject": "Open Project",

  // Editor
  "editor.toolbox.categories": "Categories",
  "editor.toolbox.blocks": "Blocks",
  "editor.run": "Run",
  "editor.save": "Save",
  "editor.upload": "Upload",

  // Settings
  "settings.title": "Settings",
  "settings.general": "General",
  "settings.editor": "Editor",
  "settings.blockly": "Blockly",
  "settings.compiler": "Compiler",
  "settings.upload": "Upload",
  "settings.appearance": "Appearance",
  "settings.developer": "Developer",
  "settings.experimental": "Experimental",
  "settings.reset": "Reset to Defaults",
  "settings.import": "Import Settings",
  "settings.export": "Export Settings",

  // Notifications
  "notif.compileSuccess": "Compilation Successful",
  "notif.compileFailed": "Compilation Failed",
  "notif.uploadSuccess": "Upload Successful",
  "notif.uploadFailed": "Upload Failed",
  "notif.connected": "Connected",
  "notif.disconnected": "Disconnected",

  // Errors
  "error.unexpected": "An unexpected error occurred.",
  "error.timeout": "The operation timed out. Please try again.",
  "error.network": "A network error occurred. Check your connection.",
  "error.compile": "Failed to compile the code. Check your blocks.",
  "error.upload": "Upload failed. Check the board connection.",
  "error.usb": "USB connection lost. Please reconnect the board.",
  "error.extension": "An extension encountered an error.",
};
