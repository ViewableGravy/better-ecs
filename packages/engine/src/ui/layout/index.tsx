import React from "react";
import { EngineUiContext, type EngineUiContextValue } from "@ui/utilities/engine-context";
import { PreviewMode } from "@ui/components/previewMode";
import { EngineCanvas } from "@ui/layout/canvas";
import { EngineEditorLayout } from "@ui/layout/components/engineEditorLayout";
import { QuickActions } from "@ui/layout/quick-actions";
import { LeftSidebar } from "@ui/layout/sidebar";
import styles from "@ui/layout/styles.module.css";

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

