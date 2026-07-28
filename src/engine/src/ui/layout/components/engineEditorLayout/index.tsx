import { BottomBar } from "@engine/ui/layout/components/engineEditorLayout/bottomBar";
import { Center } from "@engine/ui/layout/components/engineEditorLayout/center";
import { LeftSidebar } from "@engine/ui/layout/components/engineEditorLayout/leftSidebar";
import { PanelContent } from "@engine/ui/layout/components/engineEditorLayout/panelContent";
import { PanelTitle } from "@engine/ui/layout/components/engineEditorLayout/panelTitle";
import { QuickActions } from "@engine/ui/layout/components/engineEditorLayout/quickActions";
import { RightSidebar } from "@engine/ui/layout/components/engineEditorLayout/rightSidebar";
import { Root } from "@engine/ui/layout/components/engineEditorLayout/root";

export type { EngineEditorLayoutQuickActionsProps, EngineEditorLayoutRootProps } from "@engine/ui/layout/components/engineEditorLayout/types";

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