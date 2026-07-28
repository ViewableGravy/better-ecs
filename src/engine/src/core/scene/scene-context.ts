import { Registry } from "@engine/ecs/registry";

/**
 * Runtime state owned by one active scene.
 *
 * A scene has exactly one ECS registry. Logical areas within a scene share that registry and
 * coordinate space; loading, visibility, and simulation policy belong to scene-level systems.
 */
export class SceneContext<TName extends string = string> {
  readonly registry: Registry;

  constructor(
    readonly name: TName,
    registry: Registry = new Registry(),
  ) {
    this.registry = registry;
  }

  /** Clears all ECS state owned by this scene. */
  clear(): void {
    this.registry.clear();
  }
}
