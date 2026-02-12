export interface AssetAdapter<T> {
  load: (path: string) => Promise<T>;
  // Future: metadata, parser options, etc.
}
