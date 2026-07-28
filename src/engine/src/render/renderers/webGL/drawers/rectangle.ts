import { createDrawer } from "@engine/render/renderers/webGL/drawers/create";
import { roundedRectangleDrawer } from "@engine/render/renderers/webGL/drawers/rounded-rectangle";

export const rectangleDrawer = createDrawer((context, data, registry) => {
  roundedRectangleDrawer(
    context,
    {
      ...data,
      type: "rounded-rectangle",
      cornerRadius: 0,
      fillEnabled: true,
    },
    registry,
  );
});
