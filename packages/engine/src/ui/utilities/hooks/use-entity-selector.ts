import type { EntityId } from "@/ecs/entity";
import { shallow } from "@ui/utilities/shallow";
import { useCallback, useRef, useSyncExternalStore } from "react";

type Observer = () => void;

export type EntityEqualityFn<T> = (left: T, right: T) => boolean;

export interface EntitySubscribable {
  subscribeEntity(entityId: EntityId, observer: Observer): () => void;
}

export function useEntitySelector<TSource extends EntitySubscribable, TSelected>(
  source: TSource,
  entityId: EntityId,
  selector: (source: TSource) => TSelected,
  equalityFn: EntityEqualityFn<TSelected> = shallow,
): TSelected {
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equalityFn);
  const selectedRef = useRef<{ value: TSelected } | null>(null);
  const sourceRef = useRef(source);
  const entityIdRef = useRef(entityId);
  const isDirtyRef = useRef(true);

  selectorRef.current = selector;
  equalityRef.current = equalityFn;

  if (sourceRef.current !== source || entityIdRef.current !== entityId) {
    sourceRef.current = source;
    entityIdRef.current = entityId;
    selectedRef.current = null;
    isDirtyRef.current = true;
  }

  const subscribe = useCallback(
    (observer: Observer) => {
      return source.subscribeEntity(entityId, () => {
        isDirtyRef.current = true;
        observer();
      });
    },
    [entityId, source],
  );

  const getSnapshot = useCallback(() => {
    if (selectedRef.current !== null && !isDirtyRef.current) {
      return selectedRef.current.value;
    }

    const nextValue = selectorRef.current(source);

    if (selectedRef.current === null) {
      selectedRef.current = { value: nextValue };
      isDirtyRef.current = false;
      return nextValue;
    }

    if (equalityRef.current(selectedRef.current.value, nextValue)) {
      isDirtyRef.current = false;
      return selectedRef.current.value;
    }

    selectedRef.current.value = nextValue;
    isDirtyRef.current = false;
    return nextValue;
  }, [source]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
