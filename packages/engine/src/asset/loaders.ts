/**
 * Built-in asset loaders for common resource types.
 */

/**
 * Load an image from a URL and return the decoded HTMLImageElement.
 * Suitable for passing to `Assets.load("key", () => loadImage(url))`.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = (_e) =>
      reject(new Error(`Failed to load image: ${url}`));

    img.src = url;
  });
}
