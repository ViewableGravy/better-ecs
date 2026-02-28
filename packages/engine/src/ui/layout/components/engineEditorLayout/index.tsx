import { BottomBar } from "@ui/layout/components/engineEditorLayout/bottomBar";
import { Center } from "@ui/layout/components/engineEditorLayout/center";
import { LeftSidebar } from "@ui/layout/components/engineEditorLayout/leftSidebar";
import { PanelContent } from "@ui/layout/components/engineEditorLayout/panelContent";
import { PanelTitle } from "@ui/layout/components/engineEditorLayout/panelTitle";
import { QuickActions } from "@ui/layout/components/engineEditorLayout/quickActions";
import { RightSidebar } from "@ui/layout/components/engineEditorLayout/rightSidebar";
import { Root } from "@ui/layout/components/engineEditorLayout/root";

export type { EngineEditorLayoutQuickActionsProps, EngineEditorLayoutRootProps } from "@ui/layout/components/engineEditorLayout/types";

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