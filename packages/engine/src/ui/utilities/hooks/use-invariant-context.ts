import { Context, use } from "react";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type NullableContext<TValue> = Context<TValue | null>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function useInvariantContext<TValue>(
  context: NullableContext<TValue>,
  message?: string,
): TValue {
  const value = use(context);
  invariant(value !== null, message);
  return value;
}
