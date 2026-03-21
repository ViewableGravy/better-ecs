import { Rgba } from "@engine/components/sprite/sprite";
import { FillColor, Opacity, OpacityTrack, StrokeColor, Tint, TintTrack } from "@engine/components/visual";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";

const DEFAULT_TINT = new Rgba(1, 1, 1, 1);
const DEFAULT_FILL = new Rgba(1, 1, 1, 1);

export function resolveEntityTint(world: UserWorld, entityId: EntityId, out: Rgba): Rgba {
  const tint = world.get(entityId, Tint)?.value ?? DEFAULT_TINT;
  const tintTrack = world.get(entityId, TintTrack)?.value;
  const opacity = world.get(entityId, Opacity)?.value ?? 1;
  const opacityTrack = world.get(entityId, OpacityTrack)?.value ?? 1;

  out.r = tint.r;
  out.g = tint.g;
  out.b = tint.b;
  out.a = tint.a * opacity * opacityTrack;

  if (!tintTrack) {
    return out;
  }

  out.r *= tintTrack.r;
  out.g *= tintTrack.g;
  out.b *= tintTrack.b;
  out.a *= tintTrack.a;
  return out;
}

export function resolveEntityFillColor(world: UserWorld, entityId: EntityId, out: Rgba): Rgba {
  const fill = world.get(entityId, FillColor)?.value ?? DEFAULT_FILL;
  const opacity = world.get(entityId, Opacity)?.value ?? 1;
  const opacityTrack = world.get(entityId, OpacityTrack)?.value ?? 1;

  out.r = fill.r;
  out.g = fill.g;
  out.b = fill.b;
  out.a = fill.a * opacity * opacityTrack;
  return out;
}

export function resolveEntityStrokeColor(world: UserWorld, entityId: EntityId, out: Rgba): Rgba | null {
  const stroke = world.get(entityId, StrokeColor)?.value;
  if (!stroke) {
    return null;
  }

  const opacity = world.get(entityId, Opacity)?.value ?? 1;
  const opacityTrack = world.get(entityId, OpacityTrack)?.value ?? 1;

  out.r = stroke.r;
  out.g = stroke.g;
  out.b = stroke.b;
  out.a = stroke.a * opacity * opacityTrack;
  return out;
}