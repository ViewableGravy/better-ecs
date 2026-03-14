import { fromContext, System } from "@engine/context";
import {
    createEngine,
    createSystem,
    type EngineSystemFactory,
    type InferEngineSystem,
    type SystemNames,
} from "@engine/core";
import { expectTypeOf } from "vitest";

const CounterSystem = createSystem("app:counter")({
  state: { count: 0 },
  methods(system) {
    return {
      increment() {
        system.data.count += 1;
      },
    };
  },
  system() {
    // no-op
  },
});

function createTestEngine() {
  return createEngine({
    systems: [CounterSystem],
  });
}
void createTestEngine;

type TestEngine = ReturnType<typeof createTestEngine>;

declare module "../../core/engine-types" {
  interface Register {
    Engine: TestEngine;
  }
}

expectTypeOf<"engine:input">().toExtend<SystemNames>();
expectTypeOf<"app:counter">().toExtend<SystemNames>();

const input = fromContext(System("engine:input"));
expectTypeOf(input).toEqualTypeOf<InferEngineSystem<EngineSystemFactory<"engine:input">>>();

const counter = fromContext(System("app:counter"));
expectTypeOf(counter).toEqualTypeOf<ReturnType<typeof CounterSystem>>();
expectTypeOf(counter.data).toEqualTypeOf<{ count: number }>();
expectTypeOf(counter.increment).toEqualTypeOf<() => void>();

export {};

