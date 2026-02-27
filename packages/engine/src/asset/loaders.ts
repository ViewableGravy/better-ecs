import { Texture, TextureSource } from "../components/texture";
import { AssetAdapter } from "./asset";
import { AssetManager } from "./AssetManager";

export type SheetSprite = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type SheetSprites = Record<string, SheetSprite>;

type SheetAsset<TSprites extends SheetSprites> = {
  type: "sheet";
  path: string;
  sprites: TSprites;
};

type RegistryValue = AssetAdapter<unknown> | SheetAsset<SheetSprites>;
type Registry = Record<string, RegistryValue>;

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

type Expand<TValue> = {
  [TKey in keyof TValue]: TValue[TKey];
};

type AssetRecordForEntry<
  TKey extends string,
  TValue extends RegistryValue,
> = TValue extends AssetAdapter<infer TAsset>
  ? { [TOutputKey in TKey]: TAsset }
  : TValue extends SheetAsset<infer TSprites>
    ? { [TOutputKey in TKey]: Texture } & {
        [TOutputKey in `${TKey}:${Extract<keyof TSprites, string>}`]: Texture;
      }
    : never;

type Assets<TRegistry extends Registry = Registry> = Expand<
  UnionToIntersection<
    {
      [TKey in Extract<keyof TRegistry, string>]: AssetRecordForEntry<TKey, TRegistry[TKey]>;
    }[Extract<keyof TRegistry, string>]
  >
>;

type ResolvedRegistry<TAssets extends Record<string, unknown>> = {
  [TKey in Extract<keyof TAssets, string>]?: AssetAdapter<TAssets[TKey]>;
};

function isSheetAsset(value: RegistryValue): value is SheetAsset<SheetSprites> {
  return typeof value === "object" && "type" in value && value.type === "sheet";
}

/**
 * Create an Asset Manager with the given registry.
 */
export function createAssetLoader<T extends Registry>(assets: T): AssetManager<Assets<T>> {
  const resolvedAssets: Record<string, AssetAdapter<unknown>> = {};

  for (const baseKey in assets) {
    if (!Object.hasOwn(assets, baseKey)) {
      continue;
    }

    const entry = assets[baseKey];

    if (!isSheetAsset(entry)) {
      resolvedAssets[baseKey] = entry;
      continue;
    }

    const sourcePromise = loadImage(entry.path).then((image) => new TextureSource(image));

    resolvedAssets[baseKey] = {
      load: async () => {
        const source = await sourcePromise;
        return new Texture(source);
      },
    };

    for (const spriteKey in entry.sprites) {
      if (!Object.hasOwn(entry.sprites, spriteKey)) {
        continue;
      }

      const sprite = entry.sprites[spriteKey];
      const childKey = `${baseKey}:${spriteKey}`;

      resolvedAssets[childKey] = {
        load: async () => {
          const source = await sourcePromise;
          return new Texture(source, sprite.x, sprite.y, sprite.w, sprite.h);
        },
      };
    }
  }

  // `resolvedAssets` is generated from `assets` at runtime; this cast bridges dynamic key expansion to static type-level key expansion.
  return new AssetManager<Assets<T>>({ assets: resolvedAssets as ResolvedRegistry<Assets<T>> });
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

/**
 * Create a sheet definition from a single source image and a map of sprite crops.
 */
export function createLoadSheet(path: string) {
  return function <TSprites extends SheetSprites>(opts: { sprites: TSprites }): SheetAsset<TSprites> {
    return {
      type: "sheet",
      path,
      sprites: opts.sprites,
    };
  };
}
