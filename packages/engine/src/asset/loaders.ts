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
 * Create an adapter that loads an image from a URL and returns the decoded HTMLImageElement.
 */
export function createLoadImage(path: string): AssetAdapter<HTMLImageElement> {
  return {
    load: () =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${path}`));

        img.src = path;
      }),
  };
}
