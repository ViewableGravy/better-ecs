import { AssetAdapter } from "./asset";
import { AssetManager } from "./AssetManager";

/**
 * Create an Asset Manager with the given registry.
 */
export function createAssetLoader<T extends Record<string, AssetAdapter<any>>>(
  assets: T,
): AssetManager<{
  [K in keyof T]: T[K] extends AssetAdapter<infer R> ? R : never;
}> {
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
