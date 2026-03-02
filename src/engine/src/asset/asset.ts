export type AssetType = "image" | "shader" | "text" | "texture";

export interface AssetAdapter<T, TType extends AssetType = AssetType> {
  load: (path: string) => Promise<T>;
  type: TType;
}
