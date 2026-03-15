import { afterEach } from "vitest";

import { unregisterEngine } from "@engine/core/global-engine";

afterEach(() => {
  unregisterEngine();
});