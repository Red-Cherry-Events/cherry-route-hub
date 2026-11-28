// Install only when the browser denies storage. Managed auth and all existing
// callers keep their normal storage path; the fallback lasts for this page only.
export function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(String(key)); },
    setItem: (key, value) => { values.set(String(key), String(value)); },
  };
}

export function ensureBrowserStorage(target: Window | undefined = typeof window === "undefined" ? undefined : window) {
  if (!target) return;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = target[name];
      const probe = `rce:storage-probe:${Date.now()}:${Math.random()}`;
      storage.setItem(probe, "1");
      storage.removeItem(probe);
    } catch {
      const fallback = memoryStorage();
      Object.defineProperty(target, name, { configurable: true, get: () => fallback });
    }
  }
}