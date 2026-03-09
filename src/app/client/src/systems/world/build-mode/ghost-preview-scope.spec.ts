import { BoxGhost } from "@client/entities/box/ghost";
import { GhostPreviewComponent } from "@client/entities/ghost";
import { GhostPreviewManager } from "@client/systems/world/build-mode/ghost-preview-manager";
import { GhostPreviewScopeUtils } from "@client/systems/world/build-mode/ghost-preview-scope";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("GhostPreviewScopeUtils", () => {
  it("removes duplicate ghosts from non-focused worlds while keeping the focused preview", () => {
    const rootWorld = new UserWorld(new World("root"));
    const focusedWorld = new UserWorld(new World("focused"));
    const otherWorld = new UserWorld(new World("other"));

    GhostPreviewManager.sync(rootWorld, null, 0, 0, BoxGhost);
    GhostPreviewManager.sync(focusedWorld, null, 20, 20, BoxGhost);
    GhostPreviewManager.sync(otherWorld, null, 40, 40, BoxGhost);

    GhostPreviewScopeUtils.pruneGhosts(rootWorld, focusedWorld, [focusedWorld, otherWorld]);

    expect(rootWorld.query(GhostPreviewComponent)).toHaveLength(0);
    expect(otherWorld.query(GhostPreviewComponent)).toHaveLength(0);
    expect(focusedWorld.query(GhostPreviewComponent)).toHaveLength(1);
  });

  it("keeps the root-world ghost when the root world is focused", () => {
    const rootWorld = new UserWorld(new World("root"));
    const otherWorld = new UserWorld(new World("other"));

    GhostPreviewManager.sync(rootWorld, null, 0, 0, BoxGhost);
    GhostPreviewManager.sync(otherWorld, null, 20, 20, BoxGhost);

    GhostPreviewScopeUtils.pruneGhosts(rootWorld, rootWorld, [rootWorld, otherWorld]);

    expect(rootWorld.query(GhostPreviewComponent)).toHaveLength(1);
    expect(otherWorld.query(GhostPreviewComponent)).toHaveLength(0);
  });
});