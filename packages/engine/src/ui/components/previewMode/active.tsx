import { ReactNode } from "react";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import { PreviewModeContext } from "./context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type PreviewModeActiveProps = {
	children?: ReactNode;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const PreviewModeActive: React.FC<PreviewModeActiveProps> = ({ children }) => {
	const [isPreviewMode] = useInvariantContext(PreviewModeContext);
	return isPreviewMode ? <>{children}</> : null;
};
