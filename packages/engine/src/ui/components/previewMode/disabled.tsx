import { ReactNode } from "react";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import { PreviewModeContext } from "@ui/components/previewMode/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type PreviewModeDisabled = React.FC<{
	children?: ReactNode;
}>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const PreviewModeDisabled: PreviewModeDisabled = ({ children }) => {
	const [isPreviewMode] = useInvariantContext(PreviewModeContext);
	return isPreviewMode ? null : <>{children}</>;
};
