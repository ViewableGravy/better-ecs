import { Allocator, type AllocatorRegistry } from "@engine/core/allocator";

export class InternalFrameAllocator<TRegistry extends AllocatorRegistry> extends Allocator<TRegistry> {}
