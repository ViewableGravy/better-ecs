import invariant from "tiny-invariant";

/**
 * Asserts that a value is non-nullable and returns it with narrowed type.
 * Throws an error if the value is null or undefined.
 * 
 * @param value - The value to check
 * @param errorMessage - Optional error message to display if assertion fails
 * @returns The value with NonNullable type
 * @throws {Error} If value is null or undefined
 */
export const invariantReturn = <T>(value: T, errorMessage?: string): NonNullable<T> => {
  invariant(value, errorMessage);
  return value;
}