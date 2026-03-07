import { GhostPreview } from "@client/systems/world/build-mode/components";
import { GhostPreviewScopeUtils } from "@client/systems/world/build-mode/ghost-preview-scope";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("GhostPreviewScopeUtils", () => {
  it("removes duplicate ghosts from non-focused worlds while keeping the focused preview", () => {
    const rootWorld = new UserWorld(new World("root"));
    const focusedWorld = new UserWorld(new World("focused"));
    const otherWorld = new UserWorld(new World("other"));

    GhostPreview.spawn(rootWorld, 0, 0);
    GhostPreview.spawn(focusedWorld, 20, 20);
    GhostPreview.spawn(otherWorld, 40, 40);

    GhostPreviewScopeUtils.pruneGhosts(rootWorld, focusedWorld, [focusedWorld, otherWorld]);

    expect(rootWorld.query(GhostPreview)).toHaveLength(0);
    expect(otherWorld.query(GhostPreview)).toHaveLength(0);
    expect(focusedWorld.query(GhostPreview)).toHaveLength(1);
  });

  it("keeps the root-world ghost when the root world is focused", () => {
    const rootWorld = new UserWorld(new World("root"));
    const otherWorld = new UserWorld(new World("other"));

    GhostPreview.spawn(rootWorld, 0, 0);
    GhostPreview.spawn(otherWorld, 20, 20);

    GhostPreviewScopeUtils.pruneGhosts(rootWorld, rootWorld, [rootWorld, otherWorld]);

    expect(rootWorld.query(GhostPreview)).toHaveLength(1);
    expect(otherWorld.query(GhostPreview)).toHaveLength(0);
  });
});