import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import { PreviewCloseIcon } from "../icons/previewCloseIcon";
import { PreviewOpenIcon } from "../icons/previewOpenIcon";
import { PreviewModeContext } from "../previewMode";
import styles from "./styles.module.css";

export const PreviewModeToggle: React.FC = () => {
	const [isPreviewMode, setIsPreviewMode] = useInvariantContext(PreviewModeContext);
	const className = [styles.quickActionButton, isPreviewMode ? styles.quickActionButtonActive : ""].join(" ");

	return (
		<button
			aria-label={isPreviewMode ? "Exit preview mode" : "Enter preview mode"}
			aria-pressed={isPreviewMode}
			onClick={() => {
				setIsPreviewMode((currentMode) => !currentMode);
			}}
			className={className}
			title={isPreviewMode ? "Exit preview mode" : "Enter preview mode"}
			type="button"
		>
			{isPreviewMode ? (
				<PreviewCloseIcon className={styles.quickActionIcon} />
			) : (
				<PreviewOpenIcon className={styles.quickActionIcon} />
			)}
		</button>
	);
};
