import type { UserWorld } from "../../ecs/world";
import { FrameAllocator, type FrameAllocatorRegistry } from "../../render/frame-allocator";
import { RenderQueue } from "../../render/render-queue";
import type { Renderer } from "../../render/renderer";
import { useEngine } from "../context";

export type RenderPassScope = "frame" | "world";

export interface WorldProvider {
  getVisibleWorlds(): readonly UserWorld[];
}

export class RenderPipelineContext<
  TRegistry extends FrameAllocatorRegistry = FrameAllocatorRegistry,
  TState extends object = Record<string, never>,
> {
  readonly renderer: Renderer;
  readonly queue = new RenderQueue();
  readonly frameAllocator: FrameAllocator<TRegistry>;
  readonly worldProvider: WorldProvider;
  readonly state: TState;

  visibleWorlds: readonly UserWorld[] = [];
  world: UserWorld;
  alpha = 1;

  constructor(options: {
    renderer: Renderer;
    worldProvider: WorldProvider;
    frameAllocator: FrameAllocator<TRegistry>;
    state: TState;
    world: UserWorld;
  }) {
    this.renderer = options.renderer;
    this.worldProvider = options.worldProvider;
    this.frameAllocator = options.frameAllocator;
    this.state = options.state;
    this.world = options.world;
  }
}

export type RenderPassContext<
  TRegistry extends FrameAllocatorRegistry = FrameAllocatorRegistry,
  TState extends object = Record<string, never>,
> = RenderPipelineContext<TRegistry, TState>;

export type RenderPass<
  TRegistry extends FrameAllocatorRegistry = FrameAllocatorRegistry,
  TState extends object = Record<string, never>,
> = {
  readonly name: string;
  readonly scope?: RenderPassScope;
  execute: (context: RenderPassContext<TRegistry, TState>) => void;
};

/**
 * utility function for creating a render pass. This is the same as defining the type
 * explicitly but automatically infers the generic parameters from the provided object.
 */
export function createRenderPass(name: string) {
  function internalCreateRenderPass<
    TRegistry extends FrameAllocatorRegistry = FrameAllocatorRegistry,
    TState extends object = Record<string, never>,
  >(renderPass: Omit<RenderPass<TRegistry, TState>, "name">): RenderPass<TRegistry, TState> {
    return {
      ...renderPass,
      name: `render:${name}`,
    };
  }

  return internalCreateRenderPass;
}

export interface RenderPipeline {
  initialize(): void;
  render(): void;
}

type CreateRenderPipelineContext<
  TRegistry extends FrameAllocatorRegistry,
  TState extends object,
> = {
  renderer: Renderer;
  worldProvider?: WorldProvider;
  frameAllocator?: FrameAllocator<TRegistry>;
  state?: TState;
};

type CreateRenderPipelineOptions<
  TRegistry extends FrameAllocatorRegistry,
  TState extends object,
> = {
  initializeContext: () => CreateRenderPipelineContext<TRegistry, TState>;
  passes: readonly RenderPass<TRegistry, TState>[];
};

class DefaultWorldProvider implements WorldProvider {
  getVisibleWorlds(): readonly UserWorld[] {
    return [useEngine().world];
  }
}

export function createRenderPipeline<
  TRegistry extends FrameAllocatorRegistry = Record<string, never>,
  TState extends object = Record<string, never>,
>(options: CreateRenderPipelineOptions<TRegistry, TState>): RenderPipeline {
  let context: RenderPipelineContext<TRegistry, TState> | null = null;

  const getOrInitializeContext = (): RenderPipelineContext<TRegistry, TState> => {
    if (context) {
      return context;
    }

    const initialized = options.initializeContext();
    const frameAllocator = initialized.frameAllocator ?? new FrameAllocator({} as TRegistry);
    const worldProvider = initialized.worldProvider ?? new DefaultWorldProvider();

    context = new RenderPipelineContext({
      renderer: initialized.renderer,
      frameAllocator,
      worldProvider,
      // `state` defaults to an empty object and is optionally extended by user code.
      // This cast is localized to the initialization boundary.
      state: (initialized.state ?? {}) as TState,
      world: useEngine().world,
    });

    return context;
  };

  const runPass = (
    pass: RenderPass<TRegistry, TState>,
    passContext: RenderPassContext<TRegistry, TState>,
  ): void => {
    if ((pass.scope ?? "frame") === "frame") {
      pass.execute(passContext);
      return;
    }

    for (const world of passContext.visibleWorlds) {
      passContext.world = world;
      pass.execute(passContext);
    }
  };

  return {
    initialize(): void {
      getOrInitializeContext();
    },
    render(): void {
      const passContext = getOrInitializeContext();
      const engine = useEngine();

      const updateTimeMs = 1000 / engine.frame.ups;
      const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
      passContext.alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1);
      passContext.visibleWorlds = passContext.worldProvider.getVisibleWorlds();

      passContext.queue.clear();
      passContext.frameAllocator.beginFrame();

      try {
        for (const pass of options.passes) {
          runPass(pass, passContext);
        }
      } finally {
        passContext.world = useEngine().world;
        passContext.frameAllocator.endFrame();
      }
    },
  };
}
