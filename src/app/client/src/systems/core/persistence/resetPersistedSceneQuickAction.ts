import { resetPersistedScene } from "@client/systems/core/persistence/controller";
import type { QuickActionRenderProps } from "@engine/ui/quick-actions";
import React, { useState } from "react";

const RESET_SCENE_LABEL = "reset-scene-and-storage";

const BUTTON_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 44px",
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  border: "1px solid #3a3f4c",
  background: "#1f2636",
  color: "#d7deee",
  padding: 0,
  cursor: "pointer",
  userSelect: "none",
};

const BUTTON_ACTIVE_STYLE: React.CSSProperties = {
  border: "1px solid var(--engineEditorActiveBorderColor)",
  background: "#2e3b66",
  color: "#e6ecff",
  cursor: "wait",
};

const ICON_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: 1,
};

export const ResetPersistedSceneQuickAction: React.FC<QuickActionRenderProps> = ({ engine }) => {
  /***** STATE *****/
  const [isResetting, setIsResetting] = useState(false);

  /***** FUNCTIONS *****/
  const handleClick = async () => {
    if (isResetting) {
      return;
    }

    setIsResetting(true);

    try {
      await resetPersistedScene(engine);
    } finally {
      setIsResetting(false);
    }
  }

  /***** RENDER *****/
  return React.createElement(
    "button",
    {
      "aria-label": RESET_SCENE_LABEL,
      disabled: isResetting,
      onClick: handleClick,
      style: isResetting ? { ...BUTTON_STYLE, ...BUTTON_ACTIVE_STYLE } : BUTTON_STYLE,
      title: RESET_SCENE_LABEL,
      type: "button",
    },
    React.createElement("span", { "aria-hidden": true, style: ICON_STYLE }, "X"),
  );
};