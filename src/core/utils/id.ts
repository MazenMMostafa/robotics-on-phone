export function generateId(): string {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}
