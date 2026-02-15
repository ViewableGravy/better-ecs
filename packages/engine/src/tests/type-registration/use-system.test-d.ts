import { expectTypeOf } from "vitest";
import z from "zod";
import {
  createEngine,
  createSystem,
  useSystem,
  type EngineSystemFactory,
  type InferEngineSystem,
  type SystemNames,
} from "../../core";

const CounterSystem = createSystem("app:counter")({
  schema: {
    default: { count: 0 },
    schema: z.object({ count: z.number() }),
  },
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

const input = useSystem("engine:input");
expectTypeOf(input).toEqualTypeOf<InferEngineSystem<EngineSystemFactory<"engine:input">>>();

const counter = useSystem("app:counter");
expectTypeOf(counter).toEqualTypeOf<ReturnType<typeof CounterSystem>>();
expectTypeOf(counter.data).toEqualTypeOf<{ count: number }>();
expectTypeOf(counter.increment).toEqualTypeOf<() => void>();

export { };

