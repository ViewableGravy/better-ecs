import { describe, expect, it, vi } from "vitest";
import { AssetManager } from "./AssetManager";
import { AssetAdapter } from "./asset";

describe("AssetManager", () => {
  it("should throw when getting non-existent asset strictly", () => {
    const manager = new AssetManager();
    expect(() => manager.getStrict("missing")).toThrow(/not found/);
  });

  it("should trigger load when getting loosely", async () => {
    const loadMock = vi.fn().mockResolvedValue("data");
    const adapter: AssetAdapter<string> = { load: loadMock };
    const registry = { assets: { test: adapter } };
    const manager = new AssetManager(registry);

    const result = manager.get("test");
    expect(result).toBeUndefined();
    expect(loadMock).toHaveBeenCalledWith("test");

    // Await the in-flight request triggered by get()
    await manager.load("test");

    // After load
    expect(manager.getStrict("test")).toBe("data");
    expect(manager.get("test")).toBe("data");
  });

  it("should deduplicate loads", () => {
    const loadMock = vi.fn().mockReturnValue(new Promise(() => undefined)); // Never resolves
    const adapter: AssetAdapter<string> = { load: loadMock };
    const registry = { assets: { test: adapter } };
    const manager = new AssetManager(registry);

    manager.get("test");
    manager.get("test");

    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("should throw correct errors for states", async () => {
    const loadMock = vi.fn().mockResolvedValue("data");
    const adapter: AssetAdapter<string> = { load: loadMock };
    const registry = { assets: { test: adapter } };
    const manager = new AssetManager(registry);

    manager.get("test");

    // While loading
    expect(() => manager.getStrict("test")).toThrow(/is still loading/);
  });

  it("should handle errors", async () => {
    const loadMock = vi.fn().mockRejectedValue(new Error("Fail"));
    const adapter: AssetAdapter<string> = { load: loadMock };
    const registry = { assets: { test: adapter } };
    const manager = new AssetManager(registry);

    // Suppress console.error for this test
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    manager.get("test");

    // Await the in-flight request triggered by get() and swallow the rejection.
    await manager.load("test").catch(() => undefined);

    expect(() => manager.getStrict("test")).toThrow(/failed to load/);
    consoleSpy.mockRestore();
  });
});
