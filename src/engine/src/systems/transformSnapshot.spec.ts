import { Transform2D, WorldTransform2D } from "@engine/components";
import { createEngine } from "@engine/core";
import { executeWithContext } from "@engine/core/context";
import type { EntityId } from "@engine/ecs/entity";
import type { RegistryMutationObserver } from "@engine/ecs/registry";
import { transformSnapshotSystem } from "@engine/systems/transformSnapshot";
import { describe, expect, it, vi } from "vitest";

describe("transformSnapshotSystem", () => {
  it("publishes one entity change after the complete world-transform previous state is finalized", () => {
    const engine = createEngine({
      systems: [],
      scenes: [],
      manualRegisterEngine: true,
    });
    const world = engine.registry;
    const entityId = world.create();
    const localTransform = new Transform2D();
    const worldTransform = new WorldTransform2D();
    worldTransform.curr.pos.set(10, 20);
    worldTransform.curr.rotation = Math.PI / 2;
    worldTransform.curr.scale.set(2, 3);
    world.add(entityId, localTransform);
    world.add(entityId, worldTransform);

    const capturedStates: Array<{
      entityId: EntityId;
      previousX: number;
      previousY: number;
      previousRotation: number;
      previousScaleX: number;
      previousScaleY: number;
    }> = [];
    const entityChanged = vi.fn<NonNullable<RegistryMutationObserver["entityChanged"]>>(
      (_, changedEntityId) => {
        if (changedEntityId !== entityId) {
          return;
        }

        capturedStates.push({
          entityId: changedEntityId,
          previousX: worldTransform.prev.pos.x,
          previousY: worldTransform.prev.pos.y,
          previousRotation: worldTransform.prev.rotation,
          previousScaleX: worldTransform.prev.scale.x,
          previousScaleY: worldTransform.prev.scale.y,
        });
      },
    );
    world.observeMutations({ entityChanged });

    const system = transformSnapshotSystem();
    executeWithContext({ engine }, () => system.system());

    expect(entityChanged).toHaveBeenCalledOnce();
    expect(capturedStates).toEqual([{
      entityId,
      previousX: 10,
      previousY: 20,
      previousRotation: Math.PI / 2,
      previousScaleX: 2,
      previousScaleY: 3,
    }]);

    entityChanged.mockClear();
    executeWithContext({ engine }, () => system.system());
    expect(entityChanged).not.toHaveBeenCalled();
  });
});
