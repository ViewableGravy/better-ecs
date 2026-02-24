import { PreviewModeActive } from "@ui/components/previewMode/active";
import { PreviewModeDisabled } from "@ui/components/previewMode/disabled";
import { PreviewModeProvider } from "@ui/components/previewMode/provider";

export const PreviewMode = Object.assign(PreviewModeProvider, {
	Active: PreviewModeActive,
  Disabled: PreviewModeDisabled
});

export { PreviewModeContext } from "@ui/components/previewMode/context";
export type { PreviewModeContextValue } from "@ui/components/previewMode/context";

