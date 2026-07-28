import {
    getQuickActionRegistrySnapshot,
    subscribeToQuickActionRegistry,
} from "@engine/ui/layout/quick-actions/registry";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import { useSyncExternalStore } from "react";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const RegisteredQuickActions: React.FC = () => {
  /***** HOOKS *****/
  const engine = useInvariantContext(
    EngineUiContext,
    "Engine UI context is missing. Wrap UI with EngineUiContext.",
  );
  const registeredQuickActions = useSyncExternalStore(
    subscribeToQuickActionRegistry,
    getQuickActionRegistrySnapshot,
    getQuickActionRegistrySnapshot,
  );

  /***** RENDER *****/
  return (
    <>
      {registeredQuickActions.map(({ component: QuickActionComponent, id }) => (
        <QuickActionComponent engine={engine} key={id} />
      ))}
    </>
  );
};