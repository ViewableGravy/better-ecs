import { ReactNode } from "react";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import { PreviewModeContext } from "@ui/components/previewMode/context";

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
