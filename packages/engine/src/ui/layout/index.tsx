import React from "react";
import { EngineUiContext, type EngineUiContextValue } from "../utilities/engine-context";
import { PreviewMode } from "../components/previewMode";
import { EngineCanvas } from "./canvas";
import { EngineEditorLayout } from "./components/engineEditorLayout";
import { QuickActions } from "./quick-actions";
import { LeftSidebar } from "./sidebar";
import styles from "./styles.module.css";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DefaultEngineEditorViewProps = {
	engine: EngineUiContextValue;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const DefaultEngineEditorView: React.FC<DefaultEngineEditorViewProps> = ({ engine }) => {
	return (
		<EngineUiContext value={engine}>
			<PreviewMode>
				<div className={styles.defaultEngineEditorView}>
					<EngineEditorLayout.Root>
						<EngineEditorLayout.QuickActions>
							<QuickActions.PreviewModeToggle />
							<QuickActions.ReloadCanvas />
							<QuickActions.ReloadEngine />
						</EngineEditorLayout.QuickActions>

						<PreviewMode.Disabled>
							<EngineEditorLayout.LeftSidebar>
								<LeftSidebar />
							</EngineEditorLayout.LeftSidebar>
						</PreviewMode.Disabled>

						<EngineEditorLayout.Center>
							<EngineCanvas />
						</EngineEditorLayout.Center>

						<PreviewMode.Disabled>
							{/* <EngineEditorLayout.RightSidebar>
								<EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
								<EngineEditorLayout.PanelContent>Right sidebar placeholder</EngineEditorLayout.PanelContent>
							</EngineEditorLayout.RightSidebar> */}

							{/* <EngineEditorLayout.BottomBar>
								<EngineEditorLayout.PanelTitle>Output / Timeline</EngineEditorLayout.PanelTitle>
								<EngineEditorLayout.PanelContent>Bottom bar placeholder</EngineEditorLayout.PanelContent>
							</EngineEditorLayout.BottomBar> */}
						</PreviewMode.Disabled>
					</EngineEditorLayout.Root>
				</div>
			</PreviewMode>
		</EngineUiContext>
	);
};

