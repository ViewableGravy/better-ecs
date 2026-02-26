import { createSystem } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { fromContext, Delta, System as ContextSystem, World } from "@repo/engine/context";
import { PlayerComponent } from "../../components/player";

export const System = createSystem("movement")({
  system() {
    /***** CONTEXT *****/
    const world = fromContext(World);
    const { data } = fromContext(ContextSystem("engine:input"));
    const [updateDelta] = fromContext(Delta);

    /***** QUERIES *****/
    const [playerId] = world.query(PlayerComponent);

    if (!playerId) return;

    const transform = world.get(playerId, Transform2D);

    if (!transform) return;

    // Handle movement using physical key codes (layout-independent)
    // Maps physical keys to movement directions
    for (const code of data.keysActive) {
      const speed = 100 * (updateDelta / 1000);

      // Vertical movement: Arrow keys or W/S
      if (code === "ArrowUp" || code === "KeyW") {
        transform.curr.pos.y -= speed;
      }
      if (code === "ArrowDown" || code === "KeyS") {
        transform.curr.pos.y += speed;
      }

      // Horizontal movement: Arrow keys or A/D
      if (code === "ArrowLeft" || code === "KeyA") {
        transform.curr.pos.x -= speed;
      }
      if (code === "ArrowRight" || code === "KeyD") {
        transform.curr.pos.x += speed;
      }
    }
  },
});
