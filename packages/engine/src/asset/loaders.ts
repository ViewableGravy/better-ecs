import { Texture } from "../components/texture";
import { AssetAdapter } from "./asset";
import { AssetManager } from "./AssetManager";

type Registry = Record<string, AssetAdapter<any>>;
type Assets<TRegistry extends Registry = Registry> = {
  [K in keyof TRegistry]: TRegistry[K] extends AssetAdapter<infer R> ? R : never;
};

/**
 * Create an Asset Manager with the given registry.
 */
export function createAssetLoader<T extends Registry>(assets: T): AssetManager<Assets<T>> {
  return new AssetManager({ assets });
}

/**
 * Helper to load an image from a URL.
 */
function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${path}`));

    img.src = path;
  });
}

/**
 * Create an adapter that loads an image from a URL and returns the decoded HTMLImageElement.
 */
export function createLoadImage(path: string): AssetAdapter<HTMLImageElement> {
  return {
    load: () => loadImage(path),
  };
}

/**
 * Create an adapter that loads an image from a URL and returns an engine Texture.
 */
export function createLoadTexture(path: string): AssetAdapter<Texture> {
  return {
    load: async () => {
      const img = await loadImage(path);
      return new Texture(img);
    },
  };
}
