import { AssetAdapter } from "./asset";

type Assets = Record<string, unknown>;
type Registry = { assets: Record<string, AssetAdapter<any>> };
type AssetKey<TAssets extends Assets> = keyof TAssets extends string ? keyof TAssets : never;

export class AssetManager<TAssets extends Assets = Assets> {
  // TODO: this is not a map of string, any, similarly to how requests is not
  // Promise<any>. This should be typed as TAssets[K] and functions like `load`
  // should be typed as their corresponding return types, such that we get
  // the correct return type for a given key. Although the return types
  // should effectively conform to a standard interface, we can stil know whether
  // it is an image, etc. based on the key and the registry type.
  /**
   * Internal storage for resolved assets.
   */
  private storage = new Map<string, any>();
  private states = new Map<string, "loading" | "error" | "ready">();
  private requests = new Map<string, Promise<any>>();

  /**
   * Registry stores the initial manifest or loader configuration.
   */
  private registry: Registry;

  constructor(registry: Registry = { assets: {} }) {
    this.registry = registry;
  }

  /**
   * strict typed retrieval.
   * Throws if asset is missing in storage.
   */
  getStrict<K extends AssetKey<TAssets>>(key: K): TAssets[K] {
    const k = String(key);
    const state = this.states.get(k);

    if (state === "loading") {
      throw new Error(`[AssetManager] Asset "${k}" is still loading.`);
    }

    if (state === "error") {
      throw new Error(`[AssetManager] Asset "${k}" failed to load.`);
    }

    if (state === undefined) {
      throw new Error(`[AssetManager] Asset "${k}" not found.`);
    }

    return this.storage.get(k) as TAssets[K];
  }

  /**
   * Typed retrieval. Returns undefined if missing (and triggers load).
   */
  get<K extends AssetKey<TAssets>>(key: K): TAssets[K] | undefined {
    return this.getLoose(key);
  }

  /**
   * Loose retrieval by path string.
   */
  getLoose(path: string): any {
    const state = this.states.get(path);

    if (state === "ready") {
      return this.storage.get(path);
    }

    if (state === undefined) {
      this.load(path as AssetKey<TAssets>).catch(() => undefined);
    }

    return undefined;
  }

  public load<K extends AssetKey<TAssets>>(key: K): Promise<TAssets[K]> {
    const existing = this.requests.get(key);
    if (existing) {
      return existing;
    }

    this.states.set(key, "loading");

    const adapter = this.registry.assets[key];

    if (!adapter) {
      this.states.set(key, "error");
      const msg = `[AssetManager] No adapter found for "${key}"`;
      console.error(msg);

      // We return a rejected promise to satisfy the strict flow,
      // though get() ignores the return value.
      const promise = Promise.reject(new Error(msg));
      this.requests.set(key, promise);
      return promise;
    }

    const promise = adapter.load(key).then(
      (asset: any) => {
        this.states.set(key, "ready");
        this.storage.set(key, asset);
        return asset;
      },
      (err: any) => {
        this.states.set(key, "error");
        console.error(`[AssetManager] Failed to load "${key}":`, err);
        throw err;
      },
    );

    this.requests.set(key, promise);

    return promise;
  }
}
