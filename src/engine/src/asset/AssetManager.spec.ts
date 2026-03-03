import { describe, expect, it, vi } from "vitest";
import { AssetManager } from "@engine/asset/AssetManager";
import { AssetAdapter } from "@engine/asset/asset";

describe("AssetManager", () => {
  it("should throw when getting non-existent asset strictly", () => {
    const manager = new AssetManager();
    expect(() => manager.getStrict("missing")).toThrow(/not found/);
  });

  it("should trigger load when getting loosely", async () => {
    const loadMock = vi.fn().mockResolvedValue("data");
    const adapter: AssetAdapter<string> = { type: "text", load: loadMock };
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
    const adapter: AssetAdapter<string> = { type: "text", load: loadMock };
    const registry = { assets: { test: adapter } };
    const manager = new AssetManager(registry);

    manager.get("test");
    manager.get("test");

    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("should throw correct errors for states", async () => {
    const loadMock = vi.fn().mockResolvedValue("data");
    const adapter: AssetAdapter<string> = { type: "text", load: loadMock };
    const registry = { assets: { test: adapter } };
    const manager = new AssetManager(registry);

    manager.get("test");

    // While loading
    expect(() => manager.getStrict("test")).toThrow(/is still loading/);
  });

  it("should handle errors", async () => {
    const loadMock = vi.fn().mockRejectedValue(new Error("Fail"));
    const adapter: AssetAdapter<string> = { type: "text", load: loadMock };
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

  it("should load child assets when loading a parent asset", async () => {
    const loadParent = vi.fn().mockResolvedValue("sheet");
    const loadChildA = vi.fn().mockResolvedValue("a");
    const loadChildB = vi.fn().mockResolvedValue("b");

    const registry = {
      assets: {
        sheet: { type: "text" as const, load: loadParent },
        "sheet:100_a": { type: "text" as const, load: loadChildA },
        "sheet:80_a": { type: "text" as const, load: loadChildB },
      },
    };

    const manager = new AssetManager(registry);
    await manager.load("sheet");

    expect(loadParent).toHaveBeenCalledTimes(1);
    expect(loadChildA).toHaveBeenCalledTimes(1);
    expect(loadChildB).toHaveBeenCalledTimes(1);

    expect(manager.getStrict("sheet")).toBe("sheet");
    expect(manager.getStrict("sheet:100_a")).toBe("a");
    expect(manager.getStrict("sheet:80_a")).toBe("b");
  });
});
