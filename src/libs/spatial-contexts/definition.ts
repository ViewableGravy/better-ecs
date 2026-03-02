import type { UserWorld } from "@engine";
import type { ContextId } from "@lib/spatial-contexts/context-id";
import type { ContextPolicy } from "@lib/spatial-contexts/policy";

export type ContextSetup = (world: UserWorld) => void;

export type ContextDefinition = {
  id: ContextId;
  parentId?: ContextId;
  policy?: Partial<ContextPolicy>;
  setup?: ContextSetup;
};

export function defineContext(def: ContextDefinition): ContextDefinition {
  return def;
}
