import { ReactNode } from "react";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import { PreviewModeContext } from "@engine/ui/components/previewMode/context";

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
