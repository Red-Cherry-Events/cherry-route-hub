import { describe, it } from "node:test";
import assert from "node:assert/strict";
const expect = (actual: unknown) => ({ toBe: (expected: unknown) => assert.equal(actual, expected), toBeNull: () => assert.equal(actual, null) });
import { ensureBrowserStorage, memoryStorage } from "./browser-storage";

function browser(storage: Storage, denied = false): Window {
  const target = {};
  for (const name of ["localStorage", "sessionStorage"]) {
    Object.defineProperty(target, name, {
      configurable: true,
      get() {
        if (denied) throw new DOMException("Access denied", "SecurityError");
        return storage;
      },
    });
  }
  return target as Window;
}

describe("browser storage fallback", () => {
  it("keeps usable browser storage and existing sessions unchanged", () => {
    const storage = memoryStorage();
    storage.setItem("session", "existing");
    const target = browser(storage);
    ensureBrowserStorage(target);
    expect(target.localStorage).toBe(storage);
    expect(target.localStorage.getItem("session")).toBe("existing");
    expect(storage.length).toBe(1);
  });
  it("replaces denied getters with page-local storage for auth and preferences", () => {
    const target = browser(memoryStorage(), true);
    ensureBrowserStorage(target);
    target.localStorage.setItem("session", "signed-in");
    ensureBrowserStorage(target);
    expect(target.localStorage.getItem("session")).toBe("signed-in");
    target.localStorage.removeItem("session");
    expect(target.localStorage.getItem("session")).toBeNull();
    target.sessionStorage.setItem("crew", "1");
    expect(target.sessionStorage.getItem("crew")).toBe("1");
  });
  it("falls back when storage access works but writes are blocked", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
    const target = browser(storage);
    ensureBrowserStorage(target);
    target.localStorage.setItem("session", "new");
    expect(target.localStorage.getItem("session")).toBe("new");
  });
  it("does not share fallback sessions between pages", () => {
    const first = browser(memoryStorage(), true);
    const second = browser(memoryStorage(), true);
    ensureBrowserStorage(first);
    ensureBrowserStorage(second);
    first.localStorage.setItem("session", "private");
    expect(second.localStorage.getItem("session")).toBeNull();
  });
});