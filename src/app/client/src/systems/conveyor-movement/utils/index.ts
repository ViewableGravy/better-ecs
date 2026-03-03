import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { PlayerComponent } from "@client/components/player";
import { PlayerFeetComponent } from "@client/components/player-feet";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { resolveWorldTransform2D, Vec2, type EntityId, type UserWorld } from "@engine";
import { Debug, Parent, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
import {
  BELT_QUERY_FILTER,
  DIRECTION_DOWN,
  DIRECTION_LEFT,
  DIRECTION_RIGHT,
  DIRECTION_UP,
  FEET_HEIGHT_MULTIPLIER,
  FEET_MIN_OVERLAP_RATIO,
  FEET_WIDTH_MULTIPLIER,
  FEET_Y_OFFSET_MULTIPLIER,
  SHARED_BELT_WORLD_TRANSFORM,
  SHARED_FEET_WORLD_TRANSFORM,
  SHARED_MOTION,
  SIDE_TO_INWARD,
  SIDE_TO_OUTWARD,
} from "../constants";
import { type BeltFlow, type FeetGeometry, type Side } from "../types";
import { ConveyorGeometryUtils } from "./geometry-utils";
import { ConveyorMathUtils } from "./math-utils";

const DEFAULT_PLAYER_RADIUS = 16;

export class ConveyorMovementGroupedUtilities {
  public static apply(world: UserWorld, seconds: number): void {
    this.cleanupOrphanFeet(world);

    const [playerId] = world.invariantQuery(PlayerComponent);
    const playerTransform = world.require(playerId, Transform2D);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    const feetEntityId = this.ensureFeetEntity(world, playerId);
    if (!feetEntityId) {
      return;
    }

    const feetGeometry = this.resolveFeetGeometry(world, physicsWorld, feetEntityId);
    if (!feetGeometry) {
      return;
    }

    const feetBody = physicsWorld.getBody(feetEntityId);
    if (!feetBody) {
      return;
    }

    const overlaps = physicsWorld.queryOverlap({
      collider: feetBody.collider,
      transform: SHARED_FEET_WORLD_TRANSFORM,
      filter: BELT_QUERY_FILTER,
    });

    let bestOverlapRatio = 0;
    let bestBeltEntityId: EntityId | undefined;
    let bestBeltCollider: RectangleCollider | undefined;

    for (const overlap of overlaps) {
      const beltComponent = world.get(overlap.entityId, ConveyorBeltComponent);
      if (!beltComponent) {
        continue;
      }

      const beltTransform = resolveWorldTransform2D(world, overlap.entityId, SHARED_BELT_WORLD_TRANSFORM)
        ? SHARED_BELT_WORLD_TRANSFORM
        : overlap.transform;

      const overlapRatio = ConveyorGeometryUtils.computeFeetOverlapRatio(
        feetGeometry,
        overlap.collider,
        beltTransform,
      );
      if (overlapRatio < FEET_MIN_OVERLAP_RATIO) {
        continue;
      }

      if (overlapRatio <= bestOverlapRatio) {
        continue;
      }

      bestOverlapRatio = overlapRatio;
      bestBeltEntityId = overlap.entityId;
      bestBeltCollider = overlap.collider instanceof RectangleCollider ? overlap.collider : undefined;
    }

    if (bestBeltEntityId === undefined || !bestBeltCollider) {
      return;
    }

    const belt = world.get(bestBeltEntityId, ConveyorBeltComponent);
    const beltTransform = world.get(bestBeltEntityId, Transform2D);

    if (!belt || !beltTransform) {
      return;
    }

    const beltWorldTransform = resolveWorldTransform2D(world, bestBeltEntityId, SHARED_BELT_WORLD_TRANSFORM)
      ? SHARED_BELT_WORLD_TRANSFORM
      : beltTransform;

    this.resolveBeltMotionVector(
      belt.variant,
      playerTransform.curr.pos.x,
      playerTransform.curr.pos.y,
      beltWorldTransform,
      bestBeltCollider,
      SHARED_MOTION,
    );

    if (SHARED_MOTION.x === 0 && SHARED_MOTION.y === 0) {
      return;
    }

    const step = belt.speed * seconds;
    playerTransform.curr.pos.x += SHARED_MOTION.x * step;
    playerTransform.curr.pos.y += SHARED_MOTION.y * step;
  }

  public static cleanupOrphanFeet(world: UserWorld): void {
    for (const feetEntityId of world.query(PlayerFeetComponent)) {
      const feet = world.get(feetEntityId, PlayerFeetComponent);
      if (!feet) {
        continue;
      }

      if (world.has(feet.playerId, Transform2D)) {
        continue;
      }

      world.destroy(feetEntityId);
    }
  }

  public static ensureFeetEntity(world: UserWorld, playerId: EntityId): EntityId {
    let currentFeetEntityId: EntityId | undefined;

    for (const feetEntityId of world.query(PlayerFeetComponent)) {
      const feet = world.get(feetEntityId, PlayerFeetComponent);
      if (!feet) {
        continue;
      }

      if (!world.has(feet.playerId, Transform2D)) {
        world.destroy(feetEntityId);
        continue;
      }

      if (feet.playerId !== playerId) {
        continue;
      }

      if (!world.get(feetEntityId, Parent)) {
        world.add(feetEntityId, new Parent(playerId));
      }

      currentFeetEntityId = feetEntityId;
      break;
    }

    if (currentFeetEntityId) {
      return currentFeetEntityId;
    }

    const feetEntityId = world.create();

    const diameter = DEFAULT_PLAYER_RADIUS * 2;
    const feetWidth = diameter * FEET_WIDTH_MULTIPLIER;
    const feetHeight = diameter * FEET_HEIGHT_MULTIPLIER;
    const feetOffsetY = DEFAULT_PLAYER_RADIUS * FEET_Y_OFFSET_MULTIPLIER;

    world.add(feetEntityId, new Parent(playerId));
    world.add(feetEntityId, new Transform2D(0, feetOffsetY));
    world.add(
      feetEntityId,
      new RectangleCollider(new Vec2(-feetWidth * 0.5, -feetHeight * 0.5), new Vec2(feetWidth, feetHeight)),
    );
    world.add(feetEntityId, CollisionProfiles.ghost());
    world.add(feetEntityId, new PlayerFeetComponent(playerId));
    world.add(feetEntityId, new Debug("player-feet"));

    return feetEntityId;
  }

  public static resolveFeetGeometry(
    world: UserWorld,
    physicsWorld: ReturnType<typeof PhysicsWorldManager.requireWorld>,
    feetEntityId: EntityId,
  ): FeetGeometry | undefined {
    const feetBody = physicsWorld.getBody(feetEntityId);
    if (!feetBody || !(feetBody.collider instanceof RectangleCollider)) {
      return undefined;
    }

    if (!resolveWorldTransform2D(world, feetEntityId, SHARED_FEET_WORLD_TRANSFORM)) {
      return undefined;
    }

    const feetCenterX = SHARED_FEET_WORLD_TRANSFORM.curr.pos.x;
    const feetCenterY = SHARED_FEET_WORLD_TRANSFORM.curr.pos.y;
    const feetWidth = feetBody.collider.bounds.size.x;
    const feetHeight = feetBody.collider.bounds.size.y;

    return {
      left: feetCenterX - feetWidth * 0.5,
      right: feetCenterX + feetWidth * 0.5,
      top: feetCenterY - feetHeight * 0.5,
      bottom: feetCenterY + feetHeight * 0.5,
      area: feetWidth * feetHeight,
    };
  }

  public static resolveBeltMotionVector(
    variant: string,
    playerX: number,
    playerY: number,
    beltTransform: Transform2D,
    beltCollider: RectangleCollider,
    out: Vec2,
  ): void {
    const flow = this.resolveBeltFlow(variant);
    if (!flow) {
      out.set(0, 0);
      return;
    }

    if (flow.type === "straight") {
      out.set(flow.direction);
      return;
    }

    this.resolveCurveMotion(flow.from, flow.to, playerX, playerY, beltTransform, beltCollider, out);
  }

  public static resolveBeltFlow(variant: string): BeltFlow | undefined {
    if (variant.startsWith("horizontal_") || variant.startsWith("vertical_")) {
      const flowSides = variant.slice(variant.indexOf("_") + 1).split("-");
      if (flowSides.length === 2) {
        const toSide = flowSides[1];
        if (this.isSide(toSide)) {
          return {
            type: "straight",
            direction: SIDE_TO_OUTWARD[toSide],
          };
        }
      }
    }

    const normalizedVariant = variant.startsWith("curved_")
      ? `angled-${variant.slice("curved_".length)}`
      : variant;

    switch (variant) {
      case "horizontal-right":
      case "start-left":
      case "end-right":
        return { type: "straight", direction: DIRECTION_RIGHT };
      case "horizontal-left":
      case "end-left":
      case "start-right":
        return { type: "straight", direction: DIRECTION_LEFT };
      case "vertical-up":
      case "start-bottom":
      case "end-top":
        return { type: "straight", direction: DIRECTION_UP };
      case "vertical-down":
      case "start-top":
      case "end-bottom":
        return { type: "straight", direction: DIRECTION_DOWN };
      default:
        break;
    }

    if (!normalizedVariant.startsWith("angled-")) {
      return undefined;
    }

    const sideLabel = normalizedVariant.slice("angled-".length);
    const sideParts = sideLabel.split("-");

    if (sideParts.length !== 2) {
      return undefined;
    }

    const [from, to] = sideParts;
    if (!this.isSide(from) || !this.isSide(to)) {
      return undefined;
    }

    return {
      type: "curve",
      from,
      to,
    };
  }

  public static isSide(value: string): value is Side {
    return value === "left" || value === "right" || value === "top" || value === "bottom";
  }

  public static resolveCurveMotion(
    from: Side,
    to: Side,
    playerX: number,
    playerY: number,
    beltTransform: Transform2D,
    beltCollider: RectangleCollider,
    out: Vec2,
  ): void {
    const inward = SIDE_TO_INWARD[from];
    const outward = SIDE_TO_OUTWARD[to];

    const halfSize = Math.min(beltCollider.bounds.size.x, beltCollider.bounds.size.y) * 0.5;
    const entryX = ConveyorGeometryUtils.sideMidpointX(from, halfSize);
    const entryY = ConveyorGeometryUtils.sideMidpointY(from, halfSize);
    const exitX = ConveyorGeometryUtils.sideMidpointX(to, halfSize);
    const exitY = ConveyorGeometryUtils.sideMidpointY(to, halfSize);
    const centerX = entryX !== 0 ? entryX : exitX;
    const centerY = entryY !== 0 ? entryY : exitY;

    const localX = playerX - beltTransform.curr.pos.x;
    const localY = playerY - beltTransform.curr.pos.y;
    const radiusX = localX - centerX;
    const radiusY = localY - centerY;

    const clockwiseX = radiusY;
    const clockwiseY = -radiusX;
    const counterClockwiseX = -radiusY;
    const counterClockwiseY = radiusX;

    const clockwiseScore =
      ConveyorMathUtils.dotNormalized(clockwiseX, clockwiseY, inward.x, inward.y)
      + ConveyorMathUtils.dotNormalized(clockwiseX, clockwiseY, outward.x, outward.y);
    const counterClockwiseScore =
      ConveyorMathUtils.dotNormalized(counterClockwiseX, counterClockwiseY, inward.x, inward.y)
      + ConveyorMathUtils.dotNormalized(counterClockwiseX, counterClockwiseY, outward.x, outward.y);

    if (clockwiseScore >= counterClockwiseScore) {
      ConveyorMathUtils.setNormalized(out, clockwiseX, clockwiseY, outward);
      return;
    }

    ConveyorMathUtils.setNormalized(out, counterClockwiseX, counterClockwiseY, outward);
  }
}
