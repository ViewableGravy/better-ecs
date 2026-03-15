import {
    type PlayerAnimationState,
    type PlayerDirection,
} from "@client/components/player";
import { RENDER_LAYERS } from "@client/consts";
import { AnimatedSprite, Color } from "@engine/components";

type PlayerFrameIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22;
type PlayerSpriteSheetId = "player-idle" | "player-moving";
type PlayerAnimationAssetId = `${PlayerSpriteSheetId}:${PlayerDirection}_${PlayerFrameIndex}`;

const PLAYER_FRAME_INDICES: readonly PlayerFrameIndex[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
];

const PLAYER_SHEET_BY_STATE: Record<PlayerAnimationState, PlayerSpriteSheetId> = {
  idle: "player-idle",
  moving: "player-moving",
};

const PLAYER_PLAYBACK_RATE_BY_STATE: Record<PlayerAnimationState, number> = {
  idle: 0.15,
  moving: 0.5,
};

const PLAYER_SPRITE_WIDTH = 35;
const PLAYER_SPRITE_HEIGHT = 35;

function getPlayerAnimationFrames(
  animationState: PlayerAnimationState,
  direction: PlayerDirection,
): readonly PlayerAnimationAssetId[] {
  const sheetId = PLAYER_SHEET_BY_STATE[animationState];

  return PLAYER_FRAME_INDICES.map((frame) => {
    // The state, direction, and frame index are all constrained to registered player sheet keys.
    return `${sheetId}:${direction}_${frame}` as PlayerAnimationAssetId;
  });
}

export function createPlayerSprite(
  animationState: PlayerAnimationState,
  direction: PlayerDirection,
  previousSprite?: AnimatedSprite,
): AnimatedSprite {
  const sprite = new AnimatedSprite({
    assets: getPlayerAnimationFrames(animationState, direction),
    width: PLAYER_SPRITE_WIDTH,
    height: PLAYER_SPRITE_HEIGHT,
    anchorY: 0.8,
    tint: previousSprite
      ? new Color(
        previousSprite.tint.r,
        previousSprite.tint.g,
        previousSprite.tint.b,
        previousSprite.tint.a,
      )
      : undefined,
  });

  sprite.layer = previousSprite?.layer ?? RENDER_LAYERS.world;
  sprite.zOrder = previousSprite?.zOrder ?? 1;
  sprite.playbackRate = PLAYER_PLAYBACK_RATE_BY_STATE[animationState];

  return sprite;
}