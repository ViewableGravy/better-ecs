import type { EntityId } from "@engine/ecs/entity";
import type { ComponentStore } from "@engine/ecs/storage";
import type { Class } from "type-fest";

/** @internal Minimal world access required by reusable query cursors. */
export interface QueryCursorSource {
  getQueryCursorStore<T>(componentType: Class<T>): ComponentStore<T> | undefined;
  beginQueryCursorTraversal(): void;
  endQueryCursorTraversal(): void;
}

/**
 * Reusable two-component sparse-set query descriptor and cursor.
 *
 * The cursor is its own yielded row and reuses one IteratorResult, so a traversal allocates neither
 * a result array nor per-row tuples. Current-row fields are valid only inside the loop body.
 */
export class QueryCursor2<TA, TB> implements Iterable<QueryCursor2<TA, TB>>, Iterator<QueryCursor2<TA, TB>> {
  declare public entityId: EntityId<TA & TB>;
  declare public componentA: TA;
  declare public componentB: TB;

  readonly #source: QueryCursorSource;
  readonly #componentTypeA: Class<TA>;
  readonly #componentTypeB: Class<TB>;
  readonly #yieldResult: IteratorYieldResult<QueryCursor2<TA, TB>>;
  readonly #doneResult: IteratorReturnResult<undefined> = { done: true, value: undefined };
  #storeA: ComponentStore<TA> | undefined;
  #storeB: ComponentStore<TB> | undefined;
  #entityIds: readonly EntityId[] = [];
  #baseComponents: readonly (TA | TB)[] = [];
  #baseKey: "A" | "B" = "A";
  #index = 0;
  #active = false;

  public constructor(
    source: QueryCursorSource,
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
  ) {
    this.#source = source;
    this.#componentTypeA = componentTypeA;
    this.#componentTypeB = componentTypeB;
    this.#yieldResult = { done: false, value: this };
  }

  public [Symbol.iterator](): this {
    if (this.#active) {
      throw new Error("Cannot reuse a query cursor while its traversal is active");
    }

    this.#storeA = this.#source.getQueryCursorStore(this.#componentTypeA);
    this.#storeB = this.#source.getQueryCursorStore(this.#componentTypeB);
    this.#index = 0;
    this.#active = true;
    this.#source.beginQueryCursorTraversal();

    if (!this.#storeA || !this.#storeB) {
      this.#entityIds = [];
      this.#baseComponents = [];
      return this;
    }

    if (this.#storeA.count() <= this.#storeB.count()) {
      this.#baseKey = "A";
      this.#entityIds = this.#storeA.entityIds();
      this.#baseComponents = this.#storeA.components();
      return this;
    }

    this.#baseKey = "B";
    this.#entityIds = this.#storeB.entityIds();
    this.#baseComponents = this.#storeB.components();
    return this;
  }

  public next(): IteratorResult<QueryCursor2<TA, TB>, undefined> {
    if (!this.#active) {
      return this.#doneResult;
    }

    const storeA = this.#storeA;
    const storeB = this.#storeB;
    if (!storeA || !storeB) {
      return this.finish();
    }

    while (this.#index < this.#entityIds.length) {
      const index = this.#index;
      this.#index += 1;

      const entityId = this.#entityIds[index];
      const baseComponent = this.#baseComponents[index];
      if (entityId === undefined || baseComponent === undefined) {
        continue;
      }

      if (this.#baseKey === "A") {
        const componentB = storeB.getByEntityId(entityId);
        if (componentB === undefined) {
          continue;
        }

        // The selected base store proves the base component is TA for this traversal.
        this.componentA = baseComponent as TA;
        this.componentB = componentB;
      } else {
        const componentA = storeA.getByEntityId(entityId);
        if (componentA === undefined) {
          continue;
        }

        this.componentA = componentA;
        // The selected base store proves the base component is TB for this traversal.
        this.componentB = baseComponent as TB;
      }

      // Membership in both stores above proves the entity has both component types.
      this.entityId = entityId as EntityId<TA & TB>;
      return this.#yieldResult;
    }

    return this.finish();
  }

  public return(): IteratorResult<QueryCursor2<TA, TB>, undefined> {
    return this.finish();
  }

  private finish(): IteratorReturnResult<undefined> {
    if (!this.#active) {
      return this.#doneResult;
    }

    this.#active = false;
    this.#source.endQueryCursorTraversal();
    return this.#doneResult;
  }
}
