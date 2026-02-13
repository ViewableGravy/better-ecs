declare const CONTEXT_ID_BRAND: unique symbol;

/** A branded string to avoid mixing arbitrary ids with context ids. */
export type ContextId = string & { readonly [CONTEXT_ID_BRAND]: "ContextId" };

export function contextId(id: string): ContextId {
  // Branding is compile-time only; a cast is the only practical way to construct it.
  return id as ContextId;
}

export function isContextId(value: string): value is ContextId {
  // Branding is compile-time only.
  return value.length > 0;
}
