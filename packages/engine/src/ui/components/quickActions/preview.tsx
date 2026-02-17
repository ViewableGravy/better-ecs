import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import { PreviewModeContext } from "../previewMode";
import styles from "./styles.module.css";

export const PreviewModeToggle: React.FC = () => {
	const [isPreviewMode, setIsPreviewMode] = useInvariantContext(PreviewModeContext);
	const className = [styles.previewModeToggle, isPreviewMode ? styles.previewModeToggleActive : ""].join(" ");

	return (
		<button
			aria-label={isPreviewMode ? "Exit preview mode" : "Enter preview mode"}
			aria-pressed={isPreviewMode}
			onClick={() => {
				setIsPreviewMode((currentMode) => !currentMode);
			}}
			className={className}
			type="button"
		>
			{isPreviewMode ? "Exit Preview" : "Preview"}
		</button>
	);
};
