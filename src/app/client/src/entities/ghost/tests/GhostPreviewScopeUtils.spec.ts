import { BoxGhost } from "@client/entities/box/ghost";
import {
    GhostPreviewComponent,
    GhostPreviewManager,
    GhostPreviewScopeUtils,
} from "@client/entities/ghost";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("GhostPreviewScopeUtils", () => {
  it("removes only local duplicate ghosts from non-focused worlds", () => {
    const rootWorld = new UserWorld(new World("root"));
    const focusedWorld = new UserWorld(new World("focused"));
    const otherWorld = new UserWorld(new World("other"));

    GhostPreviewManager.sync(rootWorld, null, 0, 0, BoxGhost, undefined, true, "local-player");
    GhostPreviewManager.sync(focusedWorld, null, 20, 20, BoxGhost, undefined, true, "local-player");
    GhostPreviewManager.sync(otherWorld, null, 40, 40, BoxGhost, undefined, true, "remote-player");

    GhostPreviewScopeUtils.pruneGhosts(
      rootWorld,
      focusedWorld,
      [focusedWorld, otherWorld],
      "local-player",
    );

    expect(rootWorld.query(GhostPreviewComponent)).toHaveLength(0);
    expect(otherWorld.query(GhostPreviewComponent)).toHaveLength(1);
    expect(focusedWorld.query(GhostPreviewComponent)).toHaveLength(1);
  });

  it("destroys only the local owner's ghosts when build mode is disabled", () => {
    const rootWorld = new UserWorld(new World("root"));
    const otherWorld = new UserWorld(new World("other"));

    GhostPreviewManager.sync(rootWorld, null, 0, 0, BoxGhost, undefined, true, "local-player");
    GhostPreviewManager.sync(otherWorld, null, 20, 20, BoxGhost, undefined, true, "remote-player");

    GhostPreviewScopeUtils.destroyOwnedGhostsInWorlds(
      rootWorld,
      [rootWorld, otherWorld],
      "local-player",
    );

    expect(rootWorld.query(GhostPreviewComponent)).toHaveLength(0);
    expect(otherWorld.query(GhostPreviewComponent)).toHaveLength(1);
  });
});