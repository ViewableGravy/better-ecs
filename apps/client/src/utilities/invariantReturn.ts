import invariant from "tiny-invariant";

export const invariantReturn = <T>(value: T, errorMessage?: string): NonNullable<T> => {
  invariant(value, errorMessage);
  return value;
}