import { describe, expect, it } from "vitest";

import { Sprite, Transform2D } from "@engine/components";
import { EntityIdAllocator } from "@engine/ecs/entity";
import { UserWorld, World } from "@engine/ecs/world";

describe("World query traversal", () => {
  it("rejects structural mutation from a forEach callback", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();
    world.add(entityId, new Transform2D());
    world.add(entityId, new Sprite("test", 1, 1));

    const operations = [
      () => world.create(),
      () => world.destroy(entityId),
      () => world.add(entityId, new Sprite("replacement", 1, 1)),
      () => world.remove(entityId, Sprite),
    ];

    for (const operation of operations) {
      expect(() => {
        world.forEach(Transform2D, () => operation());
      }).toThrow("during active query traversal");
    }
  });

  it("rejects moving an entity when either world is being traversed", () => {
    const entityIds = new EntityIdAllocator();
    const source = new UserWorld(new World("source", entityIds));
    const target = new UserWorld(new World("target", entityIds));
    const sourceEntityId = source.create();
    const targetEntityId = target.create();
    source.add(sourceEntityId, new Transform2D());
    target.add(targetEntityId, new Transform2D());

    expect(() => {
      source.forEach(Transform2D, () => source.move(sourceEntityId, target));
    }).toThrow("during active query traversal");

    expect(() => {
      target.forEach(Transform2D, () => source.move(sourceEntityId, target));
    }).toThrow("during active query traversal");
  });

  it("allows component data mutation and nested read-only traversal", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();
    world.add(entityId, new Transform2D());
    world.add(entityId, new Sprite("test", 1, 1));
    let nestedVisits = 0;

    world.forEach(Transform2D, (visitedEntityId, transform) => {
      transform.curr.pos.x = 42;
      world.forEach(Sprite, (nestedEntityId) => {
        expect(nestedEntityId).toBe(visitedEntityId);
        nestedVisits += 1;
      });
    });

    expect(world.require(entityId, Transform2D).curr.pos.x).toBe(42);
    expect(nestedVisits).toBe(1);
  });

  it("releases the traversal guard when a callback throws", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();
    world.add(entityId, new Transform2D());

    expect(() => {
      world.forEach(Transform2D, () => {
        throw new Error("callback failed");
      });
    }).toThrow("callback failed");

    expect(world.create()).toBeGreaterThan(entityId);
  });

  it("reuses a typed cursor without result arrays or row tuples", () => {
    const world = new UserWorld(new World("scene"));
    const transformOnlyEntityId = world.create();
    const matchedEntityId = world.create();
    const spriteOnlyEntityId = world.create();
    world.add(transformOnlyEntityId, new Transform2D(1, 0));
    world.add(matchedEntityId, new Transform2D(2, 0));
    world.add(matchedEntityId, new Sprite("matched", 1, 1));
    world.add(spriteOnlyEntityId, new Sprite("sprite-only", 1, 1));
    const cursor = world.createQueryCursor(Transform2D, Sprite);
    const firstTraversal: Array<{ entityId: number; x: number; assetId: string }> = [];

    for (const row of cursor) {
      expect(row).toBe(cursor);
      firstTraversal.push({
        entityId: row.entityId,
        x: row.componentA.curr.pos.x,
        assetId: row.componentB.assetId,
      });
    }

    expect(firstTraversal).toEqual([
      { entityId: matchedEntityId, x: 2, assetId: "matched" },
    ]);

    world.remove(matchedEntityId, Sprite);
    world.add(transformOnlyEntityId, new Sprite("new-match", 1, 1));

    const secondTraversal: number[] = [];
    for (const row of cursor) {
      secondTraversal.push(row.entityId);
    }
    expect(secondTraversal).toEqual([transformOnlyEntityId]);
  });

  it("keeps structural mutation guarded for cursor traversal and releases on early exit", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();
    world.add(entityId, new Transform2D());
    world.add(entityId, new Sprite("test", 1, 1));
    const cursor = world.createQueryCursor(Transform2D, Sprite);

    for (const row of cursor) {
      expect(row.entityId).toBe(entityId);
      expect(() => world.create()).toThrow("during active query traversal");
      break;
    }

    expect(world.create()).toBeGreaterThan(entityId);
  });

  it("rejects re-entering the same cursor and releases its traversal guard", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();
    world.add(entityId, new Transform2D());
    world.add(entityId, new Sprite("test", 1, 1));
    const cursor = world.createQueryCursor(Transform2D, Sprite);

    expect(() => {
      for (const row of cursor) {
        expect(row.entityId).toBe(entityId);
        for (const nestedRow of cursor) {
          expect(nestedRow.entityId).toBe(entityId);
          throw new Error("unreachable");
        }
      }
    }).toThrow("Cannot reuse a query cursor");

    expect(world.create()).toBeGreaterThan(entityId);
  });
});
