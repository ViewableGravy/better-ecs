import type { StandardSchemaV1 } from "@standard-schema/spec";
import { RenderQueue } from "../render/render-queue";
import type { Renderer } from "../render/renderer";
import { useOverloadedSystem } from "./context";
import { createSystem, type EngineSystem, type SystemPriority } from "./register/system";
import { CommandBuffer } from "./utils/command-buffer";

export type RenderPipelineStage = () => void;

export class RenderPipelineContext<TCustom extends object = object, TCommands = unknown> {
  renderer: Renderer;
  commands: CommandBuffer<TCommands>;
  queue: RenderQueue;
  custom: TCustom;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.queue = new RenderQueue();

    // @ts-expect-error Defaults to {} and is then populated via .attach()
    this.custom = {};
    this.commands = new CommandBuffer<TCommands>();
  }

  attach<TCommands>(commands: CommandBuffer<TCommands>): RenderPipelineContext<TCustom, TCommands>;
  attach<TAttach extends object>(
    custom: TAttach,
  ): RenderPipelineContext<TCustom & TAttach, TCommands>;
  attach(value: CommandBuffer<TCommands> | object): RenderPipelineContext<object, TCommands> {
    if (value instanceof CommandBuffer) {
      this.commands = value;
      return this;
    }

    this.custom = Object.assign(this.custom, value);
    return this;
  }
}

type RenderPipelineSchema<TCustom extends object, TCommand> = StandardSchemaV1<
  RenderPipelineContext<TCustom, TCommand>,
  RenderPipelineContext<TCustom, TCommand>
>;

type RenderPipelineOptions<TCustom extends object, TCommand> = {
  stages: RenderPipelineStage[];
  initializeContext: () => RenderPipelineContext<TCustom, TCommand>;
  enabled?: boolean;
  priority?: SystemPriority;
};

const createPipelineSchema = <T>(): StandardSchemaV1<T, T> => {
  return {
    "~standard": {
      version: 1,
      vendor: "better-ecs",
      validate: (value: unknown) => ({ value: value as T, issues: [] }),
    },
  };
};

export const createRenderPipeline = <TName extends string>(name: TName) => {
  return <TCustom extends object, TCommand>(options: RenderPipelineOptions<TCustom, TCommand>) => {
    let context: RenderPipelineContext<TCustom, TCommand> | null = null;

    const getOrInitContext = (): RenderPipelineContext<TCustom, TCommand> => {
      if (!context) {
        context = options.initializeContext();
      }
      return context;
    };

    return createSystem(name)({
      phase: "render",
      enabled: options.enabled ?? true,
      priority: options.priority ?? 0,
      schema: {
        default: {} as RenderPipelineContext<TCustom, TCommand>,
        schema: createPipelineSchema<RenderPipelineContext<TCustom, TCommand>>(),
      },
      initialize: () => {
        const system =
          useOverloadedSystem<EngineSystem<RenderPipelineSchema<TCustom, TCommand>>>(name);
        system.data = getOrInitContext();
      },
      system: () => {
        const system =
          useOverloadedSystem<EngineSystem<RenderPipelineSchema<TCustom, TCommand>>>(name);
        system.data.commands.clear();
        system.data.queue.clear();

        for (const stage of options.stages) {
          stage();
        }
      },
    });
  };
};
