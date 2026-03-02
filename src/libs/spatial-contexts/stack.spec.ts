import { describe, expect, it } from "vitest";

import { contextId } from "@lib/spatial-contexts/context-id";
import { computeContextStack } from "@lib/spatial-contexts/stack";

describe("spatial-contexts/computeContextStack", () => {
  it("computes focused->parent chain", () => {
    const A = contextId("A");
    const B = contextId("B");
    const C = contextId("C");

    const parents = new Map([
      [A, B],
      [B, C],
    ]);

    const { stack } = computeContextStack(A, (id) => parents.get(id));
    expect(stack).toEqual([A, B, C]);
  });

  it("detects cycles", () => {
    const A = contextId("A");
    const B = contextId("B");

    const parents = new Map([
      [A, B],
      [B, A],
    ]);

    expect(() => computeContextStack(A, (id) => parents.get(id))).toThrow(/cycle/i);
  });
});
