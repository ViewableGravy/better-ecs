import type { AssetAdapter, AssetType } from "./asset";

type Assets = Record<string, unknown>;
type AssetKey<TAssets extends Assets> = Extract<keyof TAssets, string>;
type AssetState = "loading" | "error" | "ready";

type AssetKeyForType<
  TAssets extends Assets,
  TAssetTypes extends Record<string, unknown>,
  TType extends AssetType,
> = {
  [TKey in AssetKey<TAssets>]: TKey extends keyof TAssetTypes
    ? TAssetTypes[TKey] extends TType
      ? TKey
      : never
    : never;
}[AssetKey<TAssets>];

type LoadedAssetEntryForType<
  TAssets extends Assets,
  TAssetTypes extends Record<string, unknown>,
  TType extends AssetType,
> = {
  [TKey in AssetKey<TAssets>]: TKey extends keyof TAssetTypes
    ? TAssetTypes[TKey] extends TType
      ? { key: TKey; asset: TAssets[TKey] }
      : never
    : never;
}[AssetKey<TAssets>];

export interface LooseAssetManager {
  getLoose(path: string): unknown;
  loadLoose(path: string): Promise<unknown>;
  getLoadedByType(type: AssetType): ReadonlyArray<{ key: string; asset: unknown }>;
}

type Registry<TAssets extends Assets> = {
  assets: { [K in AssetKey<TAssets>]?: AssetAdapter<TAssets[K], AssetType> };
};

type AssetStorage<TAssets extends Assets> = {
  [K in AssetKey<TAssets>]?: TAssets[K];
};

type AssetRequests<TAssets extends Assets> = {
  [K in AssetKey<TAssets>]?: Promise<TAssets[K]>;
};

export class AssetManager<
  TAssets extends Assets = Assets,
  TAssetTypes extends Record<string, unknown> = Record<string, AssetType>,
> implements LooseAssetManager {
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

  /**
   * Timeout (in milliseconds) for asset loading. Default is 10 seconds.
   */
  private readonly loadTimeoutMs = 10000;

  constructor(registry: Registry<TAssets> = { assets: {} }) {
    this.registry = registry;
  }

  /**
   * Wraps a promise with a timeout. Rejects if the promise doesn't resolve within loadTimeoutMs.
   */
  private withTimeout<T>(promise: Promise<T>, key: AssetKey<TAssets>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`[AssetManager] Asset "${key}" failed to load: timeout after ${this.loadTimeoutMs}ms`));
        }, this.loadTimeoutMs);
      }),
    ]);
  }

  private isRegisteredKey(path: string): path is AssetKey<TAssets> {
    return Object.hasOwn(this.registry.assets, path);
  }

  private getChildKeys(parentKey: AssetKey<TAssets>): AssetKey<TAssets>[] {
    const prefix = `${parentKey}:`;
    const childKeys: AssetKey<TAssets>[] = [];

    for (const key in this.registry.assets) {
      if (!Object.hasOwn(this.registry.assets, key)) {
        continue;
      }

      if (key.startsWith(prefix) && this.isRegisteredKey(key)) {
        childKeys.push(key);
      }
    }

    return childKeys;
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

  loadLoose(path: string): Promise<TAssets[AssetKey<TAssets>] | undefined> {
    if (!this.isRegisteredKey(path)) {
      return Promise.resolve(undefined);
    }

    return this.load(path);
  }

  getLoadedByType(type: AssetType): ReadonlyArray<{ key: string; asset: unknown }> {
    const loaded: Array<{ key: string; asset: unknown }> = [];

    for (const key in this.registry.assets) {
      if (!Object.hasOwn(this.registry.assets, key)) {
        continue;
      }

      if (!this.isRegisteredKey(key)) {
        continue;
      }

      if (this.states[key] !== "ready") {
        continue;
      }

      const adapter = this.registry.assets[key];
      if (!adapter || adapter.type !== type) {
        continue;
      }

      const asset = this.storage[key];
      if (asset === undefined) {
        continue;
      }

      loaded.push({ key, asset });
    }

    return loaded;
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

    const promise = this.withTimeout(adapter.load(key), key).then(
      async (asset) => {
        this.states[key] = "ready";
        this.storage[key] = asset;

        const childKeys = this.getChildKeys(key);

        if (childKeys.length > 0) {
          await Promise.all(childKeys.map((childKey) => this.load(childKey)));
        }

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

  public type<TType extends AssetType>(assetType: TType): {
    get<K extends AssetKeyForType<TAssets, TAssetTypes, TType>>(key: K): TAssets[K] | undefined;
    getStrict<K extends AssetKeyForType<TAssets, TAssetTypes, TType>>(key: K): TAssets[K];
    load<K extends AssetKeyForType<TAssets, TAssetTypes, TType>>(key: K): Promise<TAssets[K]>;
    getLoaded(): ReadonlyArray<LoadedAssetEntryForType<TAssets, TAssetTypes, TType>>;
  } {
    return {
      get: (key) => this.get(key),
      getStrict: (key) => this.getStrict(key),
      load: (key) => this.load(key),
      getLoaded: () => {
        return this.getLoadedByType(assetType) as ReadonlyArray<LoadedAssetEntryForType<TAssets, TAssetTypes, TType>>;
      },
    };
  }
}
