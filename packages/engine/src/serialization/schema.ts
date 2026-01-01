// packages/engine/src/serialization/schema.ts

export interface ComponentSchema<T> {
  id: number;
  encodeJSON(data: T): unknown;
  decodeJSON(data: unknown): T;
  encodeBinary(data: T, writer: unknown): void;
  decodeBinary(reader: unknown): T;
}
