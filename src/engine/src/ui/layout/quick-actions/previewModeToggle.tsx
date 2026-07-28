import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import { PreviewCloseIcon } from "@engine/ui/components/icons/previewCloseIcon";
import { PreviewOpenIcon } from "@engine/ui/components/icons/previewOpenIcon";
import { PreviewModeContext } from "@engine/ui/components/previewMode";
import styles from "@engine/ui/layout/quick-actions/styles.module.css";

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
