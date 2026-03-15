import { PreviewMode } from "@engine/ui/components/previewMode";
import { EngineCanvas } from "@engine/ui/layout/canvas";
import { EngineEditorLayout } from "@engine/ui/layout/components/engineEditorLayout/index";
import { QuickActions } from "@engine/ui/layout/quick-actions";
import { LeftSidebar } from "@engine/ui/layout/sidebar";
import styles from "@engine/ui/layout/styles.module.css";
import { EngineUiContext, type EngineUiContextValue } from "@engine/ui/utilities/engine-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";

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
	/***** STATE *****/
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
					},
				},
			}),
	);

	/***** RENDER *****/
	return (
		<QueryClientProvider client={queryClient}>
			<EngineUiContext value={engine}>
				<PreviewMode>
					<div className={styles.defaultEngineEditorView}>
						<EngineEditorLayout.Root>
							<EngineEditorLayout.QuickActions>
								<QuickActions.PauseToggle />
								<QuickActions.QuadOutlineToggle />
								<QuickActions.CullingBoundsToggle />
								<QuickActions.PreviewModeToggle />
								<QuickActions.SaveWorld />
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
						</EngineEditorLayout.Root>
					</div>
				</PreviewMode>
			</EngineUiContext>
		</QueryClientProvider>
	);
};

