import { AssetAdapter } from "./asset";

type Assets = Record<string, unknown>;
type AssetKey<TAssets extends Assets> = Extract<keyof TAssets, string>;
type AssetState = "loading" | "error" | "ready";

type Registry<TAssets extends Assets> = {
  assets: { [K in AssetKey<TAssets>]?: AssetAdapter<TAssets[K]> };
};

type AssetStorage<TAssets extends Assets> = {
  [K in AssetKey<TAssets>]?: TAssets[K];
};

type AssetRequests<TAssets extends Assets> = {
  [K in AssetKey<TAssets>]?: Promise<TAssets[K]>;
};

export class AssetManager<TAssets extends Assets = Assets> {
  /**
   * Internal storage for resolved assets.
   */
  private storage: AssetStorage<TAssets> = {};
  private states: Partial<Record<AssetKey<TAssets>, AssetState>> = {};
  private requests: AssetRequests<TAssets> = {};

  /**
   * Registry stores the initial manifest or loader configuration.
   */
  private registry: Registry<TAssets>;

  constructor(registry: Registry<TAssets> = { assets: {} }) {
    this.registry = registry;
  }

  private isRegisteredKey(path: string): path is AssetKey<TAssets> {
    return Object.hasOwn(this.registry.assets, path);
  }

  /**
   * strict typed retrieval.
   * Throws if asset is missing in storage.
   */
  getStrict<K extends AssetKey<TAssets>>(key: K): TAssets[K] {
    const state = this.states[key];

    if (state === "loading") {
      throw new Error(`[AssetManager] Asset "${key}" is still loading.`);
    }

    if (state === "error") {
      throw new Error(`[AssetManager] Asset "${key}" failed to load.`);
    }

    if (state === undefined) {
      throw new Error(`[AssetManager] Asset "${key}" not found.`);
    }

    const asset = this.storage[key];

    if (asset === undefined) {
      throw new Error(`[AssetManager] Asset "${key}" not found.`);
    }

    return asset;
  }

  /**
   * Typed retrieval. Returns undefined if missing (and triggers load).
   */
  get<K extends AssetKey<TAssets>>(key: K): TAssets[K] | undefined {
    const state = this.states[key];

    if (state === "ready") {
      return this.storage[key];
    }

    if (state === undefined) {
      this.load(key).catch(() => undefined);
    }

    return undefined;
  }

  /**
   * Loose retrieval by path string.
   */
  getLoose(path: string): TAssets[AssetKey<TAssets>] | undefined {
    if (!this.isRegisteredKey(path)) {
      return undefined;
    }

    const key = path;
    const state = this.states[key];

    if (state === "ready") {
      return this.storage[key];
    }

    if (state === undefined) {
      this.load(key).catch(() => undefined);
    }

    return undefined;
  }

  public load<K extends AssetKey<TAssets>>(key: K): Promise<TAssets[K]> {
    const existing = this.requests[key];

    if (existing) {
      return existing;
    }

    this.states[key] = "loading";

    const adapter = this.registry.assets[key];

    if (!adapter) {
      this.states[key] = "error";
      const msg = `[AssetManager] No adapter found for "${key}"`;
      console.error(msg);

      // We return a rejected promise to satisfy the strict flow,
      // though get() ignores the return value.
      const promise = Promise.reject<TAssets[K]>(new Error(msg));
      this.requests[key] = promise;
      return promise;
    }

    const promise = adapter.load(key).then(
      (asset) => {
        this.states[key] = "ready";
        this.storage[key] = asset;
        return asset;
      },
      (err: unknown) => {
        this.states[key] = "error";
        console.error(`[AssetManager] Failed to load "${key}":`, err);
        throw err;
      },
    );

    this.requests[key] = promise;

    return promise;
  }
}
