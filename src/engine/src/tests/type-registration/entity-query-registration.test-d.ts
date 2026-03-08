import { EntityId, UserWorld, World } from "@engine";
import { expectTypeOf } from "vitest";

class ComponentA {
  value = "a";
}

class ComponentB {
  value = "b";
}

class ComponentC {
  value = "c";
}

const world = new UserWorld(new World());
const entityId = world.create();

world.add(entityId, new ComponentA());
world.add(entityId, new ComponentB());

const singleQuery = world.query(ComponentA);
const multiQuery = world.query(ComponentA, ComponentB);
const untypedEntityId = world.create();

type SingleQueryEntityId = (typeof singleQuery)[number];
type MultiQueryEntityId = (typeof multiQuery)[number];

expectTypeOf<SingleQueryEntityId>().toEqualTypeOf<EntityId<ComponentA>>();
expectTypeOf<MultiQueryEntityId>().toEqualTypeOf<EntityId<ComponentA | ComponentB>>();

const createdEntityComponentA: ComponentA | undefined = world.get(entityId, ComponentA);
void createdEntityComponentA;

const untypedEntityComponentA: ComponentA | undefined = world.get(untypedEntityId, ComponentA);
void untypedEntityComponentA;

const [singleEntityId] = singleQuery;
if (singleEntityId) {
  const singleRequiredComponentA: ComponentA = world.get(singleEntityId, ComponentA);
  const singleOptionalComponentB: ComponentB | undefined = world.get(singleEntityId, ComponentB);

  void singleRequiredComponentA;
  void singleOptionalComponentB;
}

const [multiEntityId] = multiQuery;
if (multiEntityId) {
  const multiRequiredComponentA: ComponentA = world.get(multiEntityId, ComponentA);
  const multiRequiredComponentB: ComponentB = world.get(multiEntityId, ComponentB);
  const multiOptionalComponentC: ComponentC | undefined = world.get(multiEntityId, ComponentC);

  void multiRequiredComponentA;
  void multiRequiredComponentB;
  void multiOptionalComponentC;
}

export { };
