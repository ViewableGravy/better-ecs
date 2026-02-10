import { AssetAdapter } from "./asset";

export type GlobalKey<T extends string> = `global:${T}`;

export type ExtractAdapterType<T> = T extends AssetAdapter<infer U> ? U : never;

export type ToGlobalKeys<T extends Record<string, AssetAdapter<any>>> = {
  [K in keyof T as K extends string ? GlobalKey<K> : never]: ExtractAdapterType<
    T[K]
  >;
};
