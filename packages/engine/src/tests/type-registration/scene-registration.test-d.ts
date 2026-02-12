// packages/engine/src/tests/type-registration/scene-registration.test-d.ts
/**
 * Type tests for scene registration and type inference.
 * Tests that scene names are properly inferred and setScene has correct types.
 */

import { expectTypeOf } from "vitest";
import z from "zod";
import {
  createEngine,
  createInitializationSystem,
  createScene,
  createSystem,
  type SceneDefinition,
} from "../../core";

// ============================================================
// Setup: Create test scenes and systems
// ============================================================

// Scene-only system (registered via scene definition, not engine.systems array)
const SceneOnlySystem = createSystem("scene:only")({
  schema: {
    default: null,
    schema: z.null(),
  },
  system() {
    /* no-op */
  },
});

const MenuScene = createScene("menu")({
  systems: [SceneOnlySystem],
  setup(world) {
    world.create();
  },
  teardown() {
    // cleanup
  },
});

const GameScene = createScene("game")({
  setup(world) {
    world.create();
  },
});

const PauseScene = createScene("pause")({
  setup() {
    /* setup */
  },
});

// Minimal test system
const TestSystem = createSystem("test")({
  schema: {
    default: { count: 0 },
    schema: z.object({ count: z.number() }),
  },
  system() {
    /* no-op */
  },
});

const NoSchemaSystem = createSystem("test:no-schema")({
  system() {
    /* no-op */
  },
});

expectTypeOf<ReturnType<typeof NoSchemaSystem>["data"]>().toEqualTypeOf<Record<string, never>>();

// ============================================================
// Test: createScene returns correct types
// ============================================================

// Scene definitions have correct name types
expectTypeOf(MenuScene).toExtend<SceneDefinition<"menu">>();
expectTypeOf(GameScene).toExtend<SceneDefinition<"game">>();
expectTypeOf(PauseScene).toExtend<SceneDefinition<"pause">>();

// Scene name property is correctly typed
expectTypeOf(MenuScene.name).toEqualTypeOf<"menu">();
expectTypeOf(GameScene.name).toEqualTypeOf<"game">();
expectTypeOf(PauseScene.name).toEqualTypeOf<"pause">();

// ============================================================
// Test: Engine with scenes has correct types
// ============================================================

const engine = createEngine({
  systems: [TestSystem, NoSchemaSystem],
  scenes: [MenuScene, GameScene, PauseScene],
});

// Engine's scenes property should have the correct record type
expectTypeOf(engine.scenes).toHaveProperty("menu");
expectTypeOf(engine.scenes).toHaveProperty("game");
expectTypeOf(engine.scenes).toHaveProperty("pause");

// ============================================================
// Test: engine.scene.set accepts only valid scene names
// ============================================================

// Valid scene names should work - this function is not called, only used for type checking
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function validSceneTransitions() {
  await engine.scene.set("menu");
  await engine.scene.set("game");
  await engine.scene.set("pause");
}

// @ts-expect-error - "invalid" is not a registered scene name
engine.scene.set("invalid");

// @ts-expect-error - "settings" is not a registered scene name
engine.scene.set("settings");

// ============================================================
// Test: initialScene accepts only valid scene names
// ============================================================

// Valid initial scene
createEngine({
  systems: [TestSystem],
  scenes: [MenuScene, GameScene],
  initialScene: "menu",
});

createEngine({
  systems: [TestSystem],
  scenes: [MenuScene, GameScene],
  initialScene: "game",
});

// ============================================================
// Test: Engine without scenes still works
// ============================================================

const engineNoScenes = createEngine({
  systems: [TestSystem],
  initialization: createInitializationSystem(() => {
    /* no-op */
  }),
});

// World should still be accessible
expectTypeOf(engineNoScenes.world).not.toBeUndefined();

// ============================================================
// Test: AllSceneNames resolves correctly with module augmentation
// ============================================================

import { AllSceneNames } from "../../core/engine-types";

// When Register is properly augmented with an engine...
// Define a test register interface
type TestRegister = {
  Engine: typeof engine;
};

// AllSceneNames should be the union of scene name literals, not 'any' or 'string'
type TestSceneNames = AllSceneNames<TestRegister>;

// Should NOT be 'any'
expectTypeOf<TestSceneNames>().not.toBeAny();

// Should NOT be 'string' (it should be a narrow union)
expectTypeOf<TestSceneNames>().not.toEqualTypeOf<string>();

// Should be assignable from valid scene names
expectTypeOf<"menu">().toExtend<TestSceneNames>();
expectTypeOf<"game">().toExtend<TestSceneNames>();
expectTypeOf<"pause">().toExtend<TestSceneNames>();

// ============================================================
// Test: AllSystemNames resolves correctly
// ============================================================

import { AllSystemNames } from "../../core/engine-types";

type TestSystemNames = AllSystemNames<TestRegister>;

// Should NOT be 'any'
expectTypeOf<TestSystemNames>().not.toBeAny();

// Should include registered system name
expectTypeOf<"test">().toExtend<TestSystemNames>();

// Should include schema-less system name
expectTypeOf<"test:no-schema">().toExtend<TestSystemNames>();

// Should include scene-registered system name
expectTypeOf<"scene:only">().toExtend<TestSystemNames>();

export { };

