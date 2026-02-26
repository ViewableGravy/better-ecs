import { engineFrameAllocatorRegistry, type EngineFrameAllocatorRegistry } from "./engine-registry";
import { InternalFrameAllocator } from "./internal-frame-allocator";
import type { FrameAllocatorRegistry, MergeFrameAllocatorRegistry } from "./types";

type UserRegistry = FrameAllocatorRegistry;

function mergeRegistry<TRegistry extends UserRegistry>(
  registry?: TRegistry,
): MergeFrameAllocatorRegistry<EngineFrameAllocatorRegistry, TRegistry> {
  // This is the generic merge boundary where user pools override engine defaults by key.
  // TypeScript cannot prove this spread-based merge for arbitrary TRegistry without an explicit cast.
  return {
    ...engineFrameAllocatorRegistry,
    ...(registry ?? {}),
  } as unknown as MergeFrameAllocatorRegistry<EngineFrameAllocatorRegistry, TRegistry>;
}

export class FrameAllocator<
  TRegistry extends UserRegistry = Record<string, never>,
> extends InternalFrameAllocator<MergeFrameAllocatorRegistry<EngineFrameAllocatorRegistry, TRegistry>> {
  constructor();
  constructor(registry: TRegistry);
  constructor(registry?: TRegistry) {
    super(mergeRegistry(registry));
  }
}
