import { Context, use } from "react";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type NullableContext<TValue> = Context<TValue | null>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
/**
 * Retrieves a context value and asserts that it is not null. If the value is null, an error will be thrown with the provided message or a default message.
 * @param context - The React context to retrieve the value from.
 * @param message - Optional custom error message for when the context value is null.
 * @returns The non-null context value.
 * @throws Will throw an error if the context value is null.
 */
export function useInvariantContext<TValue>(
  context: NullableContext<TValue>,
  message?: string,
): TValue {
  const value = use(context);

  invariant(
    value !== null, 
    message ?? `Invariant violation: ${context.displayName ?? context.name} is null`
  );

  return value;
}
