import { createSystem, useDelta, useSystem, useWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { PlayerComponent } from "../../components/player";

export const System = createSystem("movement")({
  system: Entrypoint,
});


function Entrypoint() {
  /***** HOOKS *****/
  const world = useWorld();
  const { data } = useSystem("engine:input");
  const [updateDelta] = useDelta();

  /***** QUERIES *****/
  const [playerId] = world.query(PlayerComponent);

  if (!playerId) return;

  const transform = world.get(playerId, Transform2D);

  if (!transform) return;

  // Handle movement using physical key codes (layout-independent)
  // Maps physical keys to movement directions
  for (const code of data.keysActive) {
    const speed = 50 * (updateDelta / 1000);

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
}
