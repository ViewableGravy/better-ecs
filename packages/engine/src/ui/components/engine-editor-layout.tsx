import { CSSProperties, ReactNode } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type RegionProps = {
  children?: ReactNode;
};

export type EngineEditorLayoutRootProps = {
  children?: ReactNode;
};

type RootComponent = React.FC<EngineEditorLayoutRootProps>;
type RegionComponent = React.FC<RegionProps>;

const ROOT_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px minmax(640px, 1fr) 320px",
  gridTemplateRows: "1fr 220px",
  gap: "8px",
  width: "100%",
  height: "100%",
  minHeight: "100%",
  background: "#0f1117",
  color: "#e8edf7",
  padding: "8px",
  boxSizing: "border-box",
  fontFamily: "Inter, system-ui, sans-serif"
};

const LEFT_SIDEBAR_STYLE: CSSProperties = {
  gridColumn: "1",
  gridRow: "1",
  background: "#171a21",
  border: "1px solid #2e323d",
  borderRadius: "8px",
  overflow: "auto"
};

const CENTER_STYLE: CSSProperties = {
  gridColumn: "2",
  gridRow: "1",
  background: "#131721",
  border: "1px solid #2e323d",
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: "8px",
  boxSizing: "border-box"
};

const RIGHT_SIDEBAR_STYLE: CSSProperties = {
  gridColumn: "3",
  gridRow: "1",
  background: "#171a21",
  border: "1px solid #2e323d",
  borderRadius: "8px",
  overflow: "auto"
};

const BOTTOM_BAR_STYLE: CSSProperties = {
  gridColumn: "1 / 4",
  gridRow: "2",
  background: "#171a21",
  border: "1px solid #2e323d",
  borderRadius: "8px",
  overflow: "auto"
};

const PANEL_TITLE_STYLE: CSSProperties = {
  margin: 0,
  padding: "12px",
  borderBottom: "1px solid #2e323d",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#aab4c8"
};

const PANEL_CONTENT_STYLE: CSSProperties = {
  padding: "12px"
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const Root: RootComponent = ({ children }) => {
  return <div style={ROOT_STYLE}>{children}</div>;
};

const LeftSidebar: RegionComponent = ({ children }) => {
  return <aside style={LEFT_SIDEBAR_STYLE}>{children}</aside>;
};

const Center: RegionComponent = ({ children }) => {
  return <main style={CENTER_STYLE}>{children}</main>;
};

const RightSidebar: RegionComponent = ({ children }) => {
  return <aside style={RIGHT_SIDEBAR_STYLE}>{children}</aside>;
};

const BottomBar: RegionComponent = ({ children }) => {
  return <section style={BOTTOM_BAR_STYLE}>{children}</section>;
};

const PanelTitle: RegionComponent = ({ children }) => {
  return <h3 style={PANEL_TITLE_STYLE}>{children}</h3>;
};

const PanelContent: RegionComponent = ({ children }) => {
  return <div style={PANEL_CONTENT_STYLE}>{children}</div>;
};

export const EngineEditorLayout = {
  Root,
  LeftSidebar,
  Center,
  RightSidebar,
  BottomBar,
  PanelTitle,
  PanelContent
};
