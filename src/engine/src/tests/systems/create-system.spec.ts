import { describe, expect, it } from "vitest";

import { createSystem } from "@engine/core";

describe("createSystem", () => {
  it("should default state/data to an empty object when state is omitted", () => {
    const NoStateSystem = createSystem("test:no-state-default")({
      system() {
        /* no-op */
      },
    });

    const system = NoStateSystem();

    expect(system.data).toEqual({});
    expect(system.priority).toBe(0);
    expect(system.enabled).toBe(true);
  });
});
