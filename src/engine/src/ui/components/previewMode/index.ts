import { PreviewModeActive } from "@engine/ui/components/previewMode/active";
import { PreviewModeDisabled } from "@engine/ui/components/previewMode/disabled";
import { PreviewModeProvider } from "@engine/ui/components/previewMode/provider";

export const PreviewMode = Object.assign(PreviewModeProvider, {
	Active: PreviewModeActive,
  Disabled: PreviewModeDisabled
});

export { PreviewModeContext } from "@engine/ui/components/previewMode/context";
export type { PreviewModeContextValue } from "@engine/ui/components/previewMode/context";

