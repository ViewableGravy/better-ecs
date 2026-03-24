import type { EngineClass } from "@engine/core/engine";
import { createEngine, type CreateEngineOptions } from "@engine/core/factory";
import type { SceneDefinitionTuple } from "@engine/core/scene/scene.types";
import type { SystemFactoryTuple } from "@engine/core/system/types";
import type { UserWorld } from "@engine/ecs/world";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type CreateEngineTestHarnessOptions<
  TSystems extends SystemFactoryTuple,
  TScenes extends SceneDefinitionTuple,
  TAssets extends Record<string, unknown>,
  TAssetTypes extends Record<string, unknown>,
> = CreateEngineOptions<TSystems, TScenes, TAssets, TAssetTypes> & {
  defaultUpdateDelta?: number;
  canvas?: HTMLCanvasElement;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class EngineTestHarness<
  TSystems extends SystemFactoryTuple = [],
  TScenes extends SceneDefinitionTuple = [],
  TAssets extends Record<string, unknown> = Record<string, unknown>,
  TAssetTypes extends Record<string, unknown> = Record<string, unknown>,
> {
  public readonly engine: EngineClass<TSystems, TScenes, TAssets, TAssetTypes>;

  readonly #defaultUpdateDelta: number;

  private constructor(
    engine: EngineClass<TSystems, TScenes, TAssets, TAssetTypes>,
    defaultUpdateDelta: number,
  ) {
    this.engine = engine;
    this.#defaultUpdateDelta = defaultUpdateDelta;
  }

  public static async create<
    TSystems extends SystemFactoryTuple = [],
    TScenes extends SceneDefinitionTuple = [],
    TAssets extends Record<string, unknown> = Record<string, unknown>,
    TAssetTypes extends Record<string, unknown> = Record<string, unknown>,
  >(
    options: CreateEngineTestHarnessOptions<TSystems, TScenes, TAssets, TAssetTypes>,
  ): Promise<EngineTestHarness<TSystems, TScenes, TAssets, TAssetTypes>> {
    const engine = createEngine({
      ...options,
      manualRegisterEngine: true,
    });

    if (options.canvas) {
      engine.setCanvas(options.canvas);
    }

    await engine.initialize();

    return new EngineTestHarness(
      engine,
      options.defaultUpdateDelta ?? 1000 / engine.meta.ups,
    );
  }

  public get world(): UserWorld {
    return this.engine.world;
  }

  public stepUpdate(updateDelta: number = this.#defaultUpdateDelta): void {
    this.engine.stepUpdate({
      updateDelta,
      frameDelta: updateDelta,
    });
  }

  public stepUpdates(count: number, updateDelta: number = this.#defaultUpdateDelta): void {
    for (let index = 0; index < count; index += 1) {
      this.stepUpdate(updateDelta);
    }
  }
}