import { PreviewModeContext } from "@ui/components/previewMode";
import styles from "@ui/layout/components/styles.module.css";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import classNames from "classnames";
import { useSnapshot } from "valtio";
import type { RegionProps } from "../types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Center: React.FC<RegionProps> = ({ children }) => {
  /***** HOOKS *****/
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);
  const engine = useInvariantContext(EngineUiContext);
  const { paused } = useSnapshot(engine.editor.runningState);

  /***** RENDER HELPERS *****/
  const centerClassName = classNames(styles.engineEditorLayoutCenter, {
    [styles.engineEditorLayoutCenterPreview]: isPreviewMode,
    [styles.engineEditorLayoutCenterPaused]: paused,
  });

  /***** RENDER *****/
  return <main className={centerClassName}>{children}</main>;
};