import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreviewMode } from "@ui/components/previewMode";
import { EngineCanvas } from "@ui/layout/canvas";
import { EngineEditorLayout } from "@ui/layout/components/engineEditorLayout/index";
import { QuickActions } from "@ui/layout/quick-actions";
import { LeftSidebar } from "@ui/layout/sidebar";
import styles from "@ui/layout/styles.module.css";
import { EngineUiContext, type EngineUiContextValue } from "@ui/utilities/engine-context";
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
						</EngineEditorLayout.Root>
					</div>
				</PreviewMode>
			</EngineUiContext>
		</QueryClientProvider>
	);
};

