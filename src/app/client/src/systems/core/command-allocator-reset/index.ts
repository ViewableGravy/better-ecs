import { CommandAllocator } from "@client/singletons/commandAllocator";
import { createSystem } from "@engine";

export const System = createSystem("main:command-allocator-reset")({
  priority: 100_000,
  system() {
    CommandAllocator.reset();
  },
});