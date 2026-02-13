import type { ContextId } from "./context-id";

export type GetParentId = (id: ContextId) => ContextId | undefined;

export type StackResult = {
  stack: readonly ContextId[];
};

export function computeContextStack(focusedId: ContextId, getParentId: GetParentId): StackResult {
  const stack: ContextId[] = [];
  const visited = new Set<ContextId>();

  let current: ContextId | undefined = focusedId;

  while (current) {
    if (visited.has(current)) {
      throw new Error(`Context parent chain contains a cycle at "${current}"`);
    }

    visited.add(current);
    stack.push(current);

    current = getParentId(current);
  }

  return { stack };
}
