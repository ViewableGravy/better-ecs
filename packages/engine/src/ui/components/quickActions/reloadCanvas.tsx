import { useState } from "react";
import { EngineUiContext } from "../../utilities/engine-context";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import { ReloadCanvasIcon } from "../icons/reloadCanvasIcon";
import styles from "./styles.module.css";

const RELOAD_CANVAS_LABEL = "reload-canvas-systems";

export const ReloadCanvas: React.FC = () => {
	const engine = useInvariantContext(
		EngineUiContext,
		"Engine UI context is missing. Wrap UI with EngineUiContext.",
	);
	const [isReloading, setIsReloading] = useState(false);

	return (
		<button
			aria-label={RELOAD_CANVAS_LABEL}
			className={[styles.quickActionButton, isReloading ? styles.quickActionButtonActive : ""].join(" ")}
			disabled={isReloading}
			onClick={async () => {
				if (isReloading) {
					return;
				}

				setIsReloading(true);

				try {
					await engine.scene.reload();
				} finally {
					setIsReloading(false);
				}
			}}
			title={RELOAD_CANVAS_LABEL}
			type="button"
		>
			<ReloadCanvasIcon className={styles.quickActionIcon} />
		</button>
	);
};

