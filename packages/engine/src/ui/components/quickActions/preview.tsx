import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import { PreviewModeContext } from "../previewMode";
import styles from "./styles.module.css";

const OPEN_PREVIEW_ICON_PATH = "M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z";
const CLOSE_PREVIEW_ICON_PATH = "M152,96V48a8,8,0,0,1,16,0V88h40a8,8,0,0,1,0,16H160A8,8,0,0,1,152,96ZM96,152H48a8,8,0,0,0,0,16H88v40a8,8,0,0,0,16,0V160A8,8,0,0,0,96,152Zm112,0H160a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V168h40a8,8,0,0,0,0-16ZM96,40a8,8,0,0,0-8,8V88H48a8,8,0,0,0,0,16H96a8,8,0,0,0,8-8V48A8,8,0,0,0,96,40Z";

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
			<svg aria-hidden="true" className={styles.quickActionIcon} viewBox="0 0 256 256" width="22" height="22">
				<path d={isPreviewMode ? CLOSE_PREVIEW_ICON_PATH : OPEN_PREVIEW_ICON_PATH} fill="currentColor" />
			</svg>
		</button>
	);
};
