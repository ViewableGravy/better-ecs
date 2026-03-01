import TransportBeltSprite from "@/assets/conveyor/transport-belt.png";
import { createLoadSheet } from "@repo/engine/asset";

const TRANSPORT_BELT_FRAME_SIZE = 128;
const TRANSPORT_BELT_FRAME_COUNT = 16;

const transportBeltVariants = [
  "horizontal-right",
  "horizontal-left",
  "vertical-up",
  "vertical-down",
  "angled-right-up",
  "angled-up-right",
  "angled-left-up",
  "angled-top-left",
  "angled-bottom-right",
  "angled-right-bottom",
  "angled-bottom-left",
  "angled-left-bottom",
  "start-bottom",
  "end-bottom",
  "start-left",
  "end-left",
  "start-top",
  "end-top",
  "start-right",
  "end-right",
];

const transportBeltSprites = Object.fromEntries(
  transportBeltVariants.flatMap((variant, rowIndex) =>
    Array.from({ length: TRANSPORT_BELT_FRAME_COUNT }, (_, frameIndex) => {
      const frame = frameIndex + 1;

      return [
        `${variant}_${frame}`,
        {
          x: frameIndex * TRANSPORT_BELT_FRAME_SIZE,
          y: rowIndex * TRANSPORT_BELT_FRAME_SIZE,
          w: TRANSPORT_BELT_FRAME_SIZE,
          h: TRANSPORT_BELT_FRAME_SIZE,
        },
      ];
    }),
  ),
);

export const transportBeltSheet = createLoadSheet(TransportBeltSprite)({
  sprites: transportBeltSprites,
});