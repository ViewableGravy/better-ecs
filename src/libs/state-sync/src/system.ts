import { createSystem } from "@engine";
import { Delta, Engine, fromContext, Scene } from "@engine/context";
import type { RegisteredEngine } from "@engine/core/engine-types";
import type { SceneContext } from "@engine/core/scene/scene-context";
import { applySceneStateToEngine, serializeSceneState } from "@libs/state-sync/scene-state";
import type {
    SceneStateSyncLoadContext,
    SceneStateSyncOutputAdapterContext,
    SceneStateSyncRuntimeContext,
    SerializationSystemOptions,
} from "@libs/state-sync/types";

const DEFAULT_PRIORITY = -100_000;
const DEFAULT_SYSTEM_NAME = "sync:serialization";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function serializationSystem<const TName extends string = typeof DEFAULT_SYSTEM_NAME>(
  options: SerializationSystemOptions & { name?: TName },
) {
  const name = options.name ?? (DEFAULT_SYSTEM_NAME as TName);
  const sharedContext = createSharedAdapterContext();

  return createSystem(name)({
    priority: options.priority ?? DEFAULT_PRIORITY,
    enabled: options.enabled ?? true,
    async initialize() {
      const runtimeContext = sharedContext.update();

      if (options.inputAdapter) {
        await options.inputAdapter.load(sharedContext.load());
      }

      options.outputAdapter.initialize?.(runtimeContext);
    },
    system() {
      sharedContext.update();
      options.outputAdapter.update(sharedContext.output());
    },
  });
}

function createSharedAdapterContext(): {
  update: () => SceneStateSyncRuntimeContext;
  load: () => SceneStateSyncLoadContext;
  output: () => SceneStateSyncOutputAdapterContext;
} {
  const state: {
    engine: RegisteredEngine | null;
    scene: SceneContext | null;
    updateDelta: number;
  } = {
    engine: null,
    scene: null,
    updateDelta: 0,
  };

  const adapterContext: SceneStateSyncRuntimeContext = {
    get engine() {
      return requireEngine(state);
    },
    get scene() {
      return requireScene(state);
    },
    get updateDelta() {
      return state.updateDelta;
    },
  };

  const loadContext: SceneStateSyncLoadContext = {
    get engine() {
      return requireEngine(state);
    },
    get scene() {
      return requireScene(state);
    },
    serializeSceneState: () => serializeSceneState(requireScene(state)),
    applySceneState: (sceneState) => {
      const engine = requireEngine(state);
      applySceneStateToEngine(requireScene(state), engine.serialization, sceneState);
    },
    drainDiffCommands: () => requireEngine(state).serialization.drainDiffCommands(),
  };

  const outputContext: SceneStateSyncOutputAdapterContext = {
    get engine() {
      return requireEngine(state);
    },
    get scene() {
      return requireScene(state);
    },
    get updateDelta() {
      return state.updateDelta;
    },
    get commands() {
      return requireEngine(state).serialization.peekDiffCommands();
    },
    drainCommands: () => requireEngine(state).serialization.drainDiffCommands(),
  };

  return {
    update() {
      state.engine = fromContext(Engine);
      state.scene = fromContext(Scene);
      [state.updateDelta] = fromContext(Delta);
      return adapterContext;
    },
    load() {
      return loadContext;
    },
    output() {
      return outputContext;
    },
  };
}

function requireEngine(state: { engine: RegisteredEngine | null }): RegisteredEngine {
  if (!state.engine) {
    throw new Error("Serialization system context engine is unavailable");
  }

  return state.engine;
}

function requireScene(state: { scene: SceneContext | null }): SceneContext {
  if (!state.scene) {
    throw new Error("Serialization system context scene is unavailable");
  }

  return state.scene;
}