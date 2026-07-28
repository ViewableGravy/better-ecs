import type { RegisteredEngine } from "@engine/core/engine-types";
import { useEffect } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type QuickActionRenderProps = {
  engine: RegisteredEngine;
};

export type QuickActionComponent = React.ComponentType<QuickActionRenderProps>;

export type QuickActionRegistration = {
  id: string;
  component: QuickActionComponent;
  order?: number;
};

type QuickActionRegistryListener = () => void;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const quickActionRegistry = new Map<string, QuickActionRegistration>();
const quickActionRegistryListeners = new Set<QuickActionRegistryListener>();
let quickActionRegistryVersion = 0;
let quickActionRegistrySnapshotVersion = -1;
let quickActionRegistrySnapshot: readonly QuickActionRegistration[] = [];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function registerQuickAction(registration: QuickActionRegistration): () => void {
  quickActionRegistry.set(registration.id, registration);
  emitQuickActionRegistryChange();

  return () => {
    quickActionRegistry.delete(registration.id);
    emitQuickActionRegistryChange();
  };
}

export function useRegisterQuickAction(registration: QuickActionRegistration | null): void {
  useEffect(() => {
    if (!registration) {
      return;
    }

    return registerQuickAction(registration);
  }, [registration]);
}

export function subscribeToQuickActionRegistry(listener: QuickActionRegistryListener): () => void {
  quickActionRegistryListeners.add(listener);

  return () => {
    quickActionRegistryListeners.delete(listener);
  };
}

export function getQuickActionRegistrySnapshot(): readonly QuickActionRegistration[] {
  if (quickActionRegistrySnapshotVersion === quickActionRegistryVersion) {
    return quickActionRegistrySnapshot;
  }

  quickActionRegistrySnapshot = [...quickActionRegistry.values()].sort((left, right) => {
    const orderDelta = (left.order ?? 0) - (right.order ?? 0);

    if (orderDelta !== 0) {
      return orderDelta;
    }

    return left.id.localeCompare(right.id);
  });

  quickActionRegistrySnapshotVersion = quickActionRegistryVersion;

  return quickActionRegistrySnapshot;
}

function emitQuickActionRegistryChange(): void {
  quickActionRegistryVersion += 1;

  for (const listener of quickActionRegistryListeners) {
    listener();
  }
}