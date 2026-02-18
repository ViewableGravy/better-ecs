import { ReactNode } from "react";
import { useInvariantContext } from "../utilities/hooks/use-invariant-context";
import { PreviewModeContext } from "./previewMode";
import styles from "./styles.module.css";

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
  const rootClassName = [
    styles.engineEditorLayoutRootBase,
    isPreviewMode ? styles.engineEditorLayoutRootPreview : styles.engineEditorLayoutRootDefault,
  ].join(" ");

  return <div className={rootClassName}>{children}</div>;
};

const QuickActions: QuickActionsComponent = ({ children }) => {
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);
  const quickActionsClassName = [
    styles.engineEditorLayoutQuickActionsBase,
    isPreviewMode ? styles.engineEditorLayoutQuickActionsCompact : styles.engineEditorLayoutQuickActionsGrid,
    isPreviewMode ? styles.engineEditorLayoutQuickActionsFloating : "",
  ].join(" ");

  return <section className={quickActionsClassName}>{children}</section>;
};

const LeftSidebar: RegionComponent = ({ children }) => {
  return <aside className={styles.engineEditorLayoutLeftSidebar}>{children}</aside>;
};

type CenterProps = RegionProps;

type CenterComponent = React.FC<CenterProps>;

const Center: CenterComponent = ({ children }) => {
  const [isPreviewMode] = useInvariantContext(PreviewModeContext);
  const centerClassName = [
    styles.engineEditorLayoutCenter,
    isPreviewMode ? styles.engineEditorLayoutCenterPreview : "",
  ].join(" ");

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
  const panelContentClassName = [styles.engineEditorLayoutPanelContent, className]
    .filter((value) => value !== undefined && value !== "")
    .join(" ");

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
  PanelContent
};
