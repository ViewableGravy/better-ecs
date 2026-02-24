import { createContext, Dispatch, SetStateAction } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type PreviewModeContextValue = [
	state: boolean,
	setState: Dispatch<SetStateAction<boolean>>,
];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const PreviewModeContext = createContext<PreviewModeContextValue | null>(null);
