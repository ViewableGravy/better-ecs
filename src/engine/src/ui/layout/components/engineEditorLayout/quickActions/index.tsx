import { PreviewModeContext } from "@engine/ui/components/previewMode";
import styles from "@engine/ui/layout/components/styles.module.css";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import classNames from "classnames";
import type { EngineEditorLayoutQuickActionsProps } from "@engine/ui/layout/components/engineEditorLayout/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const QuickActions: React.FC<EngineEditorLayoutQuickActionsProps> = ({ children }) => {
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);
  const quickActionsClassName = classNames(styles.engineEditorLayoutQuickActionsBase, {
    [styles.engineEditorLayoutQuickActionsCompact]: isPreviewMode,
    [styles.engineEditorLayoutQuickActionsGrid]: !isPreviewMode,
    [styles.engineEditorLayoutQuickActionsFloating]: isPreviewMode,
  });

  return <section className={quickActionsClassName}>{children}</section>;
};