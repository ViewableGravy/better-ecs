import { expectTypeOf } from "vitest";
import z from "zod";
import {
    createEngine,
    createScene,
    createSystem,
    type EngineEngineSystem,
    type EngineSystemData,
    type EngineSystemFactory,
    type EngineSystemMethods,
    type EngineSystemNames,
    type EngineSystems,
    type InferEngineSystem,
    type InferSystemData,
    type InferSystemMethods,
    type System,
    type SystemNames,
    type Systems,
    type UserlandEngineSystem,
    type UserlandSystem,
    type UserlandSystemData,
    type UserlandSystemMethods,
    type UserlandSystemNames,
    type UserlandSystems,
} from "../../core";

const GlobalSystem = createSystem("app:global")({
  schema: {
    default: { score: 0 },
    schema: z.object({ score: z.number() }),
  },
  methods(system) {
    return {
      reset() {
        system.data.score = 0;
      },
    };
  },
  system() {
    // no-op
  },
});

const SceneSystem = createSystem("app:scene")({
  system() {
    // no-op
  },
});

const Scene = createScene("scene")({
  systems: [SceneSystem],
  setup() {
    // no-op
  },
});

function createTestEngine() {
  return createEngine({
    systems: [GlobalSystem],
    scenes: [Scene],
  });
}
void createTestEngine;

type TestEngine = ReturnType<typeof createTestEngine>;

expectTypeOf<EngineSystemNames>().toEqualTypeOf<"engine:input" | "engine:transformSnapshot">();
expectTypeOf<"app:global">().toExtend<UserlandSystemNames<TestEngine>>();
expectTypeOf<"app:scene">().toExtend<UserlandSystemNames<TestEngine>>();
expectTypeOf<"engine:input">().toExtend<SystemNames<TestEngine>>();
expectTypeOf<"engine:transformSnapshot">().toExtend<SystemNames<TestEngine>>();
expectTypeOf<"app:global">().toExtend<SystemNames<TestEngine>>();
expectTypeOf<"app:scene">().toExtend<SystemNames<TestEngine>>();

expectTypeOf<UserlandSystem<"app:global", TestEngine>>().toEqualTypeOf<typeof GlobalSystem>();
expectTypeOf<UserlandSystem<"app:scene", TestEngine>>().toEqualTypeOf<typeof SceneSystem>();
expectTypeOf<System<"engine:input", TestEngine>>().toEqualTypeOf<EngineSystemFactory<"engine:input">>();
expectTypeOf<System<"app:global", TestEngine>>().toEqualTypeOf<typeof GlobalSystem>();

expectTypeOf<InferSystemData<typeof GlobalSystem>>().toEqualTypeOf<{ score: number }>();
expectTypeOf<UserlandSystemData<typeof GlobalSystem>>().toEqualTypeOf<{ score: number }>();
expectTypeOf<InferSystemMethods<typeof GlobalSystem>>().toEqualTypeOf<{ reset: () => void }>();
expectTypeOf<UserlandSystemMethods<typeof GlobalSystem>>().toEqualTypeOf<{ reset: () => void }>();

expectTypeOf<InferEngineSystem<typeof GlobalSystem>>().toEqualTypeOf<ReturnType<typeof GlobalSystem>>();
expectTypeOf<UserlandEngineSystem<typeof GlobalSystem>>().toEqualTypeOf<ReturnType<typeof GlobalSystem>>();

expectTypeOf<EngineSystemData<EngineSystemFactory<"engine:input">>>().not.toBeNever();
expectTypeOf<EngineSystemMethods<EngineSystemFactory<"engine:input">>>().toHaveProperty(
  "matchKeybind",
);
expectTypeOf<EngineEngineSystem<EngineSystemFactory<"engine:input">>>().toEqualTypeOf<
  InferEngineSystem<EngineSystemFactory<"engine:input">>
>();

expectTypeOf<Systems<TestEngine>>().toExtend<EngineSystems | UserlandSystems<TestEngine>>();
expectTypeOf<UserlandSystem<"engine:input", TestEngine>>().toEqualTypeOf<never>();

export { };

