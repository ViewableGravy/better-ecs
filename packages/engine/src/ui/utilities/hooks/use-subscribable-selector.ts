import { shallow } from "@ui/utilities/shallow";
import { useCallback, useRef, useSyncExternalStore } from "react";

type Observer = () => void;

export type EqualityFn<T> = (left: T, right: T) => boolean;

export interface Subscribable {
  subscribe(observer: Observer): () => void;
}

export function useSubscribableSelector<TSource extends Subscribable, TSelected>(
  source: TSource,
  selector: (source: TSource) => TSelected,
  equalityFn: EqualityFn<TSelected> = shallow,
): TSelected {
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equalityFn);
  const selectedRef = useRef<{ value: TSelected } | null>(null);

  selectorRef.current = selector;
  equalityRef.current = equalityFn;

  const subscribe = useCallback(
    (observer: Observer) => {
      return source.subscribe(observer);
    },
    [source],
  );

  const getSnapshot = useCallback(() => {
    const nextValue = selectorRef.current(source);

    if (selectedRef.current === null) {
      selectedRef.current = { value: nextValue };
      return nextValue;
    }

    if (equalityRef.current(selectedRef.current.value, nextValue)) {
      return selectedRef.current.value;
    }

    selectedRef.current.value = nextValue;
    return nextValue;
  }, [source]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}