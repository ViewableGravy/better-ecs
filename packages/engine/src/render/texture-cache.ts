import type { AssetManager } from "../asset/AssetManager";
import type { Texture } from "../components/texture";

/**
 * Opaque handle for loaded textures.
 * The actual type depends on the renderer implementation.
 */
export type TextureHandle = number;

/**
 * Metadata about a loaded texture.
 */
export interface TextureInfo {
  handle: TextureHandle;
  width: number;
  height: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
}

/**
 * The lifecycle state of a texture within the renderer.
 */
export type TextureState = "pending" | "ready" | "error";

/**
 * Describes the current status of a texture asset in the renderer.
 */
export interface TextureStatus {
  state: TextureState;
  /** The texture info, available when state is "ready". */
  info: TextureInfo | null;
}

/**
 * Configuration for texture caching behavior.
 */
export interface TextureCacheConfig {
  /**
   * Maximum number of new textures to upload per frame.
   * Prevents frame hitches from bulk texture uploads.
   * Set to 0 for unlimited. Default: 4.
   */
  textureUploadBudget: number;

  /**
   * Whether to log warnings when textures are lazily loaded during
   * render (indicates missing preload). Default: true in dev mode.
   */
  warnOnLazyLoad: boolean;
}

interface TextureEntry {
  handle: TextureHandle;
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement;
}

/** Maps asset IDs to their resolved TextureInfo for fast lookup. */
interface AssetTextureEntry {
  assetId: string;
  state: TextureState;
  info: TextureInfo | null;
  /** The underlying Texture object (null until resolved). */
  texture: Texture | null;
}

/**
 * Manages the lifecycle of textures: loading, caching, eviction, and
 * per-frame upload budgeting.
 *
 * This class owns the texture handle allocation, source-UID deduplication,
 * and asset-level tracking. It is backend-agnostic — the actual image data
 * is stored as generic HTMLImageElement | ImageBitmap | HTMLCanvasElement.
 */
export class TextureCache {
  private assets!: AssetManager;

  // Texture management (low-level, by source UID)
  private nextTextureHandle: TextureHandle = 1;
  private texturesBySourceUid: Map<number, TextureEntry> = new Map();
  private texturesByHandle: Map<TextureHandle, TextureEntry> = new Map();

  // Asset-level texture tracking (by asset ID)
  private assetTextures: Map<string, AssetTextureEntry> = new Map();

  // Per-frame upload budget tracking
  private uploadsThisFrame: number = 0;

  // Track asset IDs that have already been warned about lazy loading
  private lazyLoadWarned: Set<string> = new Set();

  public config: TextureCacheConfig;

  constructor(config: TextureCacheConfig) {
    this.config = config;
  }

  /** Bind the asset manager used for resolving asset IDs. */
  initialize(assets: AssetManager): void {
    this.assets = assets;
  }

  /** Reset per-frame upload budget. Call at the start of each frame. */
  resetFrameBudget(): void {
    this.uploadsThisFrame = 0;
  }

  // ── Lookup ─────────────────────────────────────────────────────

  /**
   * Get a texture handle and info from an asset ID.
   * Returns null if the texture is not yet available.
   * Triggers a lazy load if the asset is not loaded.
   */
  get(assetId: string): TextureInfo | null {
    // Fast path: already resolved and uploaded
    const existing = this.assetTextures.get(assetId);
    if (existing?.state === "ready" && existing.info) {
      return existing.info;
    }

    // Already in error state — don't retry
    if (existing?.state === "error") {
      return null;
    }

    // Check if asset is available in the AssetManager
    const texture = this.assets.get(assetId) as Texture | undefined;

    if (!texture) {
      // Asset not loaded yet — mark as pending
      if (!existing) {
        this.assetTextures.set(assetId, {
          assetId,
          state: "pending",
          info: null,
          texture: null,
        });
      }

      if (this.config.warnOnLazyLoad && !this.lazyLoadWarned.has(assetId)) {
        console.warn(
          `[TextureCache] Texture "${assetId}" lazily loaded during render. ` +
            `Consider preloading in scene setup for smoother loading.`,
        );
        this.lazyLoadWarned.add(assetId);
      }

      return null;
    }

    // Asset is available — check upload budget
    if (
      this.config.textureUploadBudget > 0 &&
      this.uploadsThisFrame >= this.config.textureUploadBudget
    ) {
      // Budget exceeded — defer upload to next frame, mark pending
      if (!existing || existing.state !== "ready") {
        this.assetTextures.set(assetId, {
          assetId,
          state: "pending",
          info: null,
          texture,
        });
      }
      return null;
    }

    // Upload the texture
    const handle = this.load(texture);
    this.uploadsThisFrame++;

    const info: TextureInfo = {
      handle,
      width: texture.width,
      height: texture.height,
      frameX: texture.frameX,
      frameY: texture.frameY,
      frameWidth: texture.frameWidth,
      frameHeight: texture.frameHeight,
    };

    this.assetTextures.set(assetId, {
      assetId,
      state: "ready",
      info,
      texture,
    });

    return info;
  }

  /**
   * Get the current state of a texture asset.
   */
  getStatus(assetId: string): TextureStatus {
    const entry = this.assetTextures.get(assetId);

    if (!entry) {
      return { state: "pending", info: null };
    }

    return { state: entry.state, info: entry.info };
  }

  // ── Low-level handle management ────────────────────────────────

  /**
   * Load a texture from an engine Texture object, returns a handle.
   * Handles caching — multiple calls with the same TextureSource
   * return the same handle.
   */
  load(texture: Texture): TextureHandle {
    const sourceUid = texture.source.uid;

    // Check if source already uploaded
    const existing = this.texturesBySourceUid.get(sourceUid);
    if (existing) {
      return existing.handle;
    }

    const handle = this.nextTextureHandle++;
    const entry: TextureEntry = { handle, image: texture.source.resource };

    this.texturesBySourceUid.set(sourceUid, entry);
    this.texturesByHandle.set(handle, entry);

    return handle;
  }

  /** Get a previously loaded texture handle by its source uid. */
  getHandle(sourceUid: number): TextureHandle | null {
    const entry = this.texturesBySourceUid.get(sourceUid);
    return entry ? entry.handle : null;
  }

  /** Get the image data for a texture handle. */
  getImage(handle: TextureHandle): HTMLImageElement | ImageBitmap | HTMLCanvasElement | null {
    const entry = this.texturesByHandle.get(handle);
    return entry ? entry.image : null;
  }

  /** Delete a loaded texture and free associated resources. */
  delete(handle: TextureHandle): void {
    const entry = this.texturesByHandle.get(handle);
    if (!entry) return;

    // Find and remove from source uid map
    for (const [uid, e] of this.texturesBySourceUid.entries()) {
      if (e.handle === handle) {
        this.texturesBySourceUid.delete(uid);
        break;
      }
    }

    this.texturesByHandle.delete(handle);
  }

  // ── Preload / eviction ─────────────────────────────────────────

  /**
   * Preload textures for the given asset IDs. Returns a promise that
   * resolves when all textures are loaded and uploaded.
   */
  async preload(assetIds: string[]): Promise<void> {
    const loadPromises = assetIds.map((id) => this.assets.load(id));
    const results = await Promise.allSettled(loadPromises);

    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const result = results[i];

      if (result.status === "fulfilled") {
        const texture = result.value as Texture;
        const handle = this.load(texture);
        this.assetTextures.set(assetId, {
          assetId,
          state: "ready",
          info: {
            handle,
            width: texture.width,
            height: texture.height,
            frameX: texture.frameX,
            frameY: texture.frameY,
            frameWidth: texture.frameWidth,
            frameHeight: texture.frameHeight,
          },
          texture,
        });
      } else {
        this.assetTextures.set(assetId, {
          assetId,
          state: "error",
          info: null,
          texture: null,
        });
        console.error(`[TextureCache] Failed to preload texture "${assetId}":`, result.reason);
      }
    }
  }

  /**
   * Evict a texture by asset ID, freeing resources.
   * The texture can be re-loaded later on demand.
   */
  evict(assetId: string): void {
    const entry = this.assetTextures.get(assetId);
    if (!entry?.info) {
      this.assetTextures.delete(assetId);
      return;
    }

    this.delete(entry.info.handle);
    this.assetTextures.delete(assetId);
    this.lazyLoadWarned.delete(assetId);
  }

  /** Evict all loaded textures and free resources. */
  evictAll(): void {
    for (const entry of this.assetTextures.values()) {
      if (entry.info) {
        this.delete(entry.info.handle);
      }
    }
    this.assetTextures.clear();
    this.lazyLoadWarned.clear();
  }
}
