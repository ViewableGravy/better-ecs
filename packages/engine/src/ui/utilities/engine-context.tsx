import { createContext } from "react";
import type { SceneDefinitionTuple, SystemFactoryTuple } from "../../core";
import type { EngineClass } from "../../core/register/internal";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type EngineUiContextValue = EngineClass<
	SystemFactoryTuple,
	SceneDefinitionTuple,
	Record<string, unknown>
>;


/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const EngineUiContext = createContext<EngineUiContextValue | null>(null);
