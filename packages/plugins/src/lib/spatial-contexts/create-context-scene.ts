import {
    createScene,
    type SceneConfig,
    type SceneContext,
    type SystemFactoryTuple,
} from "@repo/engine";
import type { ContextId } from "./context-id";
import type { ContextDefinition } from "./definition";
import { installSpatialContexts } from "./install";
import type { SpatialContextManager } from "./manager";
import { createSpatialContextsRuntimeSystem } from "./runtime.system.factory";

type ContextSceneOptions<TSystems extends SystemFactoryTuple> = Omit<
  SceneConfig<TSystems>,
  "systems" | "sceneSetup"
> & {
  systems?: TSystems;
  contexts: {
    definitions: readonly ContextDefinition[];
    focusedContextId?: ContextId;
    preloadContextIds?: readonly ContextId[];
  };
  sceneSetup?: (scene: SceneContext, manager: SpatialContextManager) => void | Promise<void>;
};

/**
 * Wrapper around `createScene` that wires spatial-contexts runtime behavior automatically.
 */
export const createContextScene = <TName extends string>(name: TName) => {
  return <const TSystems extends SystemFactoryTuple = []>(
    config: ContextSceneOptions<TSystems>,
  ) => {
    const runtimeSystem = createSpatialContextsRuntimeSystem(name);
    const userSystems = config.systems ?? [];

    return createScene(name)({
      ...config,
      systems: [runtimeSystem, ...userSystems],
      async sceneSetup(scene) {
        const manager = installSpatialContexts(scene, {
          definitions: config.contexts.definitions,
        });

        if (config.contexts.focusedContextId) {
          manager.setFocusedContextId(config.contexts.focusedContextId);
        }

        for (const id of config.contexts.preloadContextIds ?? []) {
          manager.ensureWorldLoaded(id);
        }

        await config.sceneSetup?.(scene, manager);
      },
    });
  };
};
