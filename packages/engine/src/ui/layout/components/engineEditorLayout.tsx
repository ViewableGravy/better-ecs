import { PreviewModeContext } from "@ui/components/previewMode";
import styles from "@ui/layout/components/styles.module.css";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import classNames from "classnames";
import { ReactNode } from "react";
import { useSnapshot } from "valtio";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type RegionProps = {
  children?: ReactNode;
  className?: string;
};

export type EngineEditorLayoutRootProps = {
  children?: ReactNode;
};

export type EngineEditorLayoutQuickActionsProps = {
  children?: ReactNode;
};

type RootComponent = React.FC<EngineEditorLayoutRootProps>;
type RegionComponent = React.FC<RegionProps>;
type QuickActionsComponent = React.FC<EngineEditorLayoutQuickActionsProps>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const Root: RootComponent = ({ children }) => {
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);
  const rootClassName = classNames(styles.engineEditorLayoutRootBase, {
    [styles.engineEditorLayoutRootPreview]: isPreviewMode,
    [styles.engineEditorLayoutRootDefault]: !isPreviewMode,
  });

  return <div className={rootClassName}>{children}</div>;
};

const QuickActions: QuickActionsComponent = ({ children }) => {
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);
  const quickActionsClassName = classNames(styles.engineEditorLayoutQuickActionsBase, {
    [styles.engineEditorLayoutQuickActionsCompact]: isPreviewMode,
    [styles.engineEditorLayoutQuickActionsGrid]: !isPreviewMode,
    [styles.engineEditorLayoutQuickActionsFloating]: isPreviewMode,
  });

  return <section className={quickActionsClassName}>{children}</section>;
};

const LeftSidebar: RegionComponent = ({ children }) => {
  return <aside className={styles.engineEditorLayoutLeftSidebar}>{children}</aside>;
};

type CenterProps = RegionProps;

type CenterComponent = React.FC<CenterProps>;

const Center: CenterComponent = ({ children }) => {
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);
  const engine = useInvariantContext(EngineUiContext);
  const { paused } = useSnapshot(engine.editor.runningState);
  const centerClassName = classNames(styles.engineEditorLayoutCenter, {
    [styles.engineEditorLayoutCenterPreview]: isPreviewMode,
    [styles.engineEditorLayoutCenterPaused]: paused,
  });

  return <main className={centerClassName}>{children}</main>;
};

const RightSidebar: RegionComponent = ({ children }) => {
  return <aside className={styles.engineEditorLayoutRightSidebar}>{children}</aside>;
};

const BottomBar: RegionComponent = ({ children }) => {
  return <section className={styles.engineEditorLayoutBottomBar}>{children}</section>;
};

const PanelTitle: RegionComponent = ({ children }) => {
  return <h3 className={styles.engineEditorLayoutPanelTitle}>{children}</h3>;
};

const PanelContent: RegionComponent = ({ children, className }) => {
  const panelContentClassName = classNames(styles.engineEditorLayoutPanelContent, className);

  return <div className={panelContentClassName}>{children}</div>;
};

export const EngineEditorLayout = {
  Root,
  QuickActions,
  LeftSidebar,
  Center,
  RightSidebar,
  BottomBar,
  PanelTitle,
  PanelContent,
};
