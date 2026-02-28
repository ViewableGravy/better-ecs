import { PreviewModeContext } from "@ui/components/previewMode";
import styles from "@ui/layout/components/styles.module.css";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import classNames from "classnames";
import { useRef, useState, type CSSProperties } from "react";
import type { EngineEditorLayoutRootProps } from "@ui/layout/components/engineEditorLayout/types";
import { useHandleResize } from "@ui/layout/components/engineEditorLayout/root/useHandleResize";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Root: React.FC<EngineEditorLayoutRootProps> = ({ children }) => {
  /***** STATE *****/
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const startX = useRef(0);
  const startWidth = useRef(0);

  /***** HOOKS *****/
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);

  const { isResizing, handleMouseDown } = useHandleResize((event) => {
    const delta = event.clientX - startX.current;
    const nextWidth = Math.max(
      200,
      Math.min(startWidth.current + delta, 600),
    );

    setSidebarWidth(nextWidth);
  });

  const rootClassName = classNames(styles.engineEditorLayoutRootBase, {
    [styles.engineEditorLayoutRootPreview]: isPreviewMode,
    [styles.engineEditorLayoutRootDefault]: !isPreviewMode,
    [styles.engineEditorLayoutRootResizing]: isResizing,
  });

  const rootStyle = {
    "--sidebar-width": `${sidebarWidth}px`,
  } as CSSProperties;

  function onResizeStart(event: React.MouseEvent): void {
    startX.current = event.clientX;
    startWidth.current = sidebarWidth;
    handleMouseDown(event);
  }

  return (
    <div className={rootClassName} style={rootStyle}>
      {!isPreviewMode && (
        <div className={styles.engineEditorLayoutResizeHandle} onMouseDown={onResizeStart} />
      )}
      {children}
    </div>
  );
};