import { describe, expect, it } from "vitest";

import { createSystem } from "../../core";

describe("createSystem", () => {
  it("should default schema/data to an empty object when schema is omitted", () => {
    const NoSchemaSystem = createSystem("test:no-schema-default")({
      system() {
        /* no-op */
      },
    });

    const system = NoSchemaSystem();

    expect(system.data).toEqual({});
    expect(system.priority).toBe(0);
    expect(system.enabled).toBe(true);
  });
});
