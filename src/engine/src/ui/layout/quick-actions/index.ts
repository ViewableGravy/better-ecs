import { CullingBoundsToggle } from "@engine/ui/layout/quick-actions/cullingBoundsToggle";
import { PauseToggle } from "@engine/ui/layout/quick-actions/pauseToggle";
import { PreviewModeToggle } from "@engine/ui/layout/quick-actions/previewModeToggle";
import { QuadOutlineToggle } from "@engine/ui/layout/quick-actions/quadOutlineToggle";
import { RegisteredQuickActions } from "@engine/ui/layout/quick-actions/registeredQuickActions";
import { ReloadCanvas } from "@engine/ui/layout/quick-actions/reloadCanvas";
import { ReloadEngine } from "@engine/ui/layout/quick-actions/reloadEngine";
import { SaveWorld } from "@engine/ui/layout/quick-actions/saveWorld";
export {
    registerQuickAction,
    useRegisterQuickAction,
    type QuickActionRegistration,
    type QuickActionRenderProps
} from "@engine/ui/layout/quick-actions/registry";

export const QuickActions = {
  PauseToggle,
  QuadOutlineToggle,
  CullingBoundsToggle,
  PreviewModeToggle,
  SaveWorld,
  ReloadCanvas,
  ReloadEngine,
  RegisteredQuickActions,
};
