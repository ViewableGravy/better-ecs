/**
 * AssetCache — a simple load-once, cache-forever store for externally loaded data.
 *
 * Inspired by PixiJS Assets: the first call to `load()` fetches and caches;
 * subsequent calls for the same key return the cached value synchronously via
 * `get()`, or the same promise via `load()`.
 *
 * Usage:
 *   const assets = new AssetCache();
 *   const tex = await assets.load("player", () => loadImage("/sprites/player.png"));
 *   const same = assets.get("player"); // synchronous, same reference
 */

export interface AssetAdapter<T> {
  load: (path: string) => Promise<T>;
  // Future: metadata, parser options, etc.
}

export type AssetLoader<T> = () => Promise<T>;

export class AssetCache {
  /** Resolved values — available synchronously after load completes. */
  #cache = new Map<string, unknown>();

  /** In-flight promises — deduplicates concurrent loads of the same key. */
  #pending = new Map<string, Promise<unknown>>();

  /**
   * Load an asset by key. If already cached, resolves immediately.
   * If a load is in flight for this key, returns the same promise.
   * Otherwise, calls `loader()` and caches the result.
   */
  async load<T>(key: string, loader: AssetLoader<T>): Promise<T> {
    // Already resolved — fast path
    if (this.#cache.has(key)) {
      return this.#cache.get(key) as T;
    }

    // Already loading — deduplicate
    if (this.#pending.has(key)) {
      return this.#pending.get(key) as Promise<T>;
    }

    // Start load
    const promise = loader().then((value) => {
      this.#cache.set(key, value);
      this.#pending.delete(key);
      return value;
    });

    this.#pending.set(key, promise);
    return promise;
  }

  /**
   * Synchronously retrieve a previously-loaded asset.
   * Returns `undefined` if the asset has not been loaded yet.
   */
  get<T>(key: string): T | undefined {
    return this.#cache.get(key) as T | undefined;
  }

  /**
   * Synchronously retrieve a previously-loaded asset, throwing an error if not found.
   * Useful for cases where the asset is expected to be loaded by this point, e.g. in a scene's `setup()`.
   */
  getStrict<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Asset with key "${key}" not found in cache`);
    }
    return value;
  }

  /**
   * Check whether an asset is loaded (synchronously available).
   */
  has(key: string): boolean {
    return this.#cache.has(key);
  }

  /**
   * Remove an asset from the cache. Does **not** dispose GPU resources —
   * the caller is responsible for that.
   */
  delete(key: string): boolean {
    this.#pending.delete(key);
    return this.#cache.delete(key);
  }

  /** Remove all cached assets. */
  clear(): void {
    this.#cache.clear();
    this.#pending.clear();
  }
}

/**
 * Global singleton asset cache shared across the engine.
 * Import and use directly:
 *   import { Assets } from "@repo/engine/asset";
 *   await Assets.load("player", loader);
 */
export const Assets = new AssetCache();
