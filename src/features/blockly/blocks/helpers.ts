export function safeArduinoName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, "_");
  if (/^[0-9]/.test(cleaned)) return `var_${cleaned}`;
  return cleaned || "myVariable";
}

export function getVariableName(block: {
  getField: (name: string) => { getText: () => string } | null;
}) {
  const field = block.getField("VAR");
  return safeArduinoName(field?.getText() ?? "myVariable");
}

export function q(value: string) {
  return JSON.stringify(value);
}

export function uniqueLines(text: string) {
  const seen = new Set<string>();
  return text
    .split("\n")
    .filter((line) => {
      const key = line.trim();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}
