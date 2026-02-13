import {
  createScene,
  type SceneConfig,
  type SceneContext,
  type SystemFactoryTuple,
  type UserWorld,
} from "@repo/engine";
import type { ContextDefinition } from "./definition";
import { installSpatialContexts } from "./install";
import type { SpatialContextManager } from "./manager";
import { createSpatialContextsRuntimeSystem } from "./runtime.system.factory";

type ContextSceneOptions<TSystems extends SystemFactoryTuple> = Omit<
  SceneConfig<TSystems>,
  "systems" | "setup" | "sceneSetup"
> & {
  systems?: TSystems;
  contexts: readonly ContextDefinition[];
  setup?: (world: UserWorld, manager: SpatialContextManager) => void | Promise<void>;
  sceneSetup?: (scene: SceneContext, manager: SpatialContextManager) => void | Promise<void>;
};

/**
 * Wrapper around `createScene` that wires spatial-contexts runtime behavior automatically.
 */
export const createContextScene = <TName extends string>(name: TName) => {
  return <const TSystems extends SystemFactoryTuple = []>(
    config: ContextSceneOptions<TSystems>,
  ) => {
    let manager: SpatialContextManager | undefined;
    const runtimeSystem = createSpatialContextsRuntimeSystem(name);
    const userSystems = config.systems ?? [];

    return createScene(name)({
      ...config,
      systems: [runtimeSystem, ...userSystems],
      async setup(world) {
        if (!manager) {
          throw new Error(
            "SpatialContextManager was not initialized before scene setup. Ensure sceneSetup runs before setup.",
          );
        }

        await config.setup?.(world, manager);
      },
      async sceneSetup(scene) {
        manager = installSpatialContexts(scene, {
          definitions: config.contexts,
        });

        const [firstContextDefinition] = config.contexts;
        if (firstContextDefinition) {
          manager.setFocusedContextId(firstContextDefinition.id);
        }
        await config.sceneSetup?.(scene, manager);
      },
    });
  };
};
