import { deriveChunkCoordinate, deriveLocalCoordinate } from "@client/systems/terrain/utilities";
import { describe, expect, test } from "vitest";

describe("terrain utilities", () => {
  test("maps negative coordinates to mathematical floor chunks", () => {
    const chunkX = deriveChunkCoordinate(-1);
    const chunkY = deriveChunkCoordinate(-9);

    expect(chunkX).toBe(-1);
    expect(chunkY).toBe(-2);
    expect(deriveLocalCoordinate(-1, chunkX)).toBe(7);
    expect(deriveLocalCoordinate(-9, chunkY)).toBe(7);
  });
});
