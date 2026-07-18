import type { LibraryDefinition } from "../../types/extension";

class LibraryRegistryClass {
  private libraries = new Map<string, LibraryDefinition>();

  register(library: LibraryDefinition): void {
    this.libraries.set(library.name, library);
  }

  registerMany(libraries: LibraryDefinition[]): void {
    for (const lib of libraries) {
      this.libraries.set(lib.name, lib);
    }
  }

  unregister(name: string): void {
    this.libraries.delete(name);
  }

  getLibrary(name: string): LibraryDefinition | undefined {
    return this.libraries.get(name);
  }

  getAllLibraries(): LibraryDefinition[] {
    return Array.from(this.libraries.values());
  }

  getLibrariesForBoard(boardId: string): LibraryDefinition[] {
    return this.getAllLibraries().filter(
      (lib) => !lib.boards || lib.boards.length === 0 || lib.boards.includes(boardId),
    );
  }

  getHeaders(libraryNames: string[]): string[] {
    const headers: string[] = [];
    for (const name of libraryNames) {
      const lib = this.libraries.get(name);
      if (lib) {
        for (const h of lib.headers) {
          if (!headers.includes(h)) {
            headers.push(h);
          }
        }
      }
    }
    return headers;
  }

  hasLibrary(name: string): boolean {
    return this.libraries.has(name);
  }

  clear(): void {
    this.libraries.clear();
  }
}

export const LibraryRegistry = new LibraryRegistryClass();
