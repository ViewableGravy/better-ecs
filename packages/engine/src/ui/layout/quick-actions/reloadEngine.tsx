import { ReloadEngineIcon } from "@ui/components/icons/reloadEngineIcon";
import styles from "@ui/layout/quick-actions/styles.module.css";

const RELOAD_ENGINE_LABEL = "full-reload";

export const ReloadEngine: React.FC = () => {
  return (
    <button
      aria-label={RELOAD_ENGINE_LABEL}
      className={styles.quickActionButton}
      onClick={() => {
        window.location.reload();
      }}
      title={RELOAD_ENGINE_LABEL}
      type="button"
    >
      <ReloadEngineIcon className={styles.quickActionIcon} />
    </button>
  );
};
