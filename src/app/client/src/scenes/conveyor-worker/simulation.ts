/**
 * Core conveyor belt simulation engine.
 *
 * Pure data — no ECS, no DOM, no worker deps. Designed to run in a Web Worker
 * or on the main thread. All state is flat arrays for cache-friendly iteration.
 */

import type { BeltDirection, BeltFlow, BeltSide, BeltVariant, GridCoord, GridPos } from "@client/scenes/conveyor-worker/types";
import {
  BELT_HALF_SIZE,
  CELL_SIZE,
  DIRECTION_OFFSETS,
  OPPOSITE_DIRECTION,
  PROGRESS_SEAM_EPSILON,
  SLOT_ADVANCE_TICKS,
  SLOT_COUNT,
  adjacentGrid,
  canStoreEntities,
  getCurveLaneSides,
  getFlow,
  getVariantByFlow,
  gridKey,
  gridToWorld,
  isCurve,
  isStraightFlow,
  worldToGrid,
} from "@client/scenes/conveyor-worker/types";
import { resolveSlotLocalPos, type SlotPos } from "@client/scenes/conveyor-worker/slot-positions";

// ── Belt state ──────────────────────────────────────────────────────────────

export type BeltId = number; // 1-based index, 0 = none

export interface BeltState {
  id: BeltId;
  variant: BeltVariant;
  gx: GridCoord;
  gy: GridCoord;
  previousId: BeltId;
  nextId: BeltId;
  leftSlots: [number, number, number, number];   // ItemId per slot, 0 = empty
  rightSlots: [number, number, number, number];
  leftProgress: [number, number, number, number];
  rightProgress: [number, number, number, number];
  leftTailBlocked: boolean;
  rightTailBlocked: boolean;
  tailDir: BeltDirection;
  headDir: BeltDirection;
  isTerminal: boolean;
  isCurve: boolean;
}

// ── Item state ──────────────────────────────────────────────────────────────

export type ItemId = number; // 1-based index, 0 = none

export interface ItemState {
  id: ItemId;
  beltId: BeltId;
  side: BeltSide;
  slotIndex: number;
  worldX: number;
  worldY: number;
}

// ── Snapshot output ────────────────────────────────────────────────────────

export interface PositionSnapshot {
  /** Flat Float32Array: [itemX, itemY, itemX, itemY, ...] */
  positions: Float32Array;
  itemCount: number;
  tick: number;
}

// ── Placement commands ─────────────────────────────────────────────────────

export type PlaceBeltCommand = {
  type: "place";
  worldX: number;
  worldY: number;
};

export type RemoveBeltCommand = {
  type: "remove";
  worldX: number;
  worldY: number;
};

export type PlaceItemCommand = {
  type: "place-item";
  beltX: number;
  beltY: number;
  side: BeltSide;
  slotIndex: number;
  /** Item type identifier (for rendering). */
  itemType: string;
};

export type SimulationCommand = PlaceBeltCommand | RemoveBeltCommand | PlaceItemCommand;

// ── Simulation ──────────────────────────────────────────────────────────────

const INITIAL_BELT_COUNT = 256;
const INITIAL_ITEM_CAPACITY = 256;

export class ConveyorSimulation {
  belts: BeltState[];
  items: ItemState[];
  spatialGrid: Map<string, BeltId>;

  private nextBeltIndex = 1;
  private nextItemIndex = 1;
  tick = 0;

  /** Scratch shared vec for position computation. */
  private readonly sharedPos = { x: 0, y: 0 };

  constructor() {
    this.belts = new Array(INITIAL_BELT_COUNT);
    this.items = new Array(INITIAL_ITEM_CAPACITY);
    this.spatialGrid = new Map<string, BeltId>();
  }

  // ── Placement ───────────────────────────────────────────────────────────

  /** Place a belt at world coordinates. Returns the new belt ID. */
  placeBelt(worldX: number, worldY: number): BeltId {
    return this.placeBeltWithVariant(worldX, worldY, null);
  }

  /** Place a belt with an explicit variant (null = auto-derive from neighbors). */
  placeBeltWithVariant(worldX: number, worldY: number, variant: BeltVariant | null): BeltId {
    const [gx, gy] = worldToGrid(worldX, worldY);
    const existing = this.findBeltAt(gx, gy);
    if (existing) {
      return existing;
    }

    const id = this.nextBeltIndex++ as BeltId;

    // Determine variant from neighbors or use explicit
    const resolved: BeltVariant = variant ?? (() => {
      const t = this.resolveBestTailDirection(gx, gy);
      const h = OPPOSITE_DIRECTION[t];
      return (getVariantByFlow(t, h) ?? "horizontal-right") as BeltVariant;
    })();

    const flow = getFlow(resolved);

    const belt: BeltState = {
      id, variant: resolved, gx, gy,
      previousId: 0, nextId: 0,
      leftSlots: [0, 0, 0, 0],
      rightSlots: [0, 0, 0, 0],
      leftProgress: [0, 0, 0, 0],
      rightProgress: [0, 0, 0, 0],
      leftTailBlocked: false,
      rightTailBlocked: false,
      tailDir: flow[0],
      headDir: flow[1],
      isTerminal: !canStoreEntities(resolved),
      isCurve: isCurve(resolved),
    };

    this.belts[id] = belt;
    this.spatialGrid.set(gridKey(gx, gy), id);

    // Connect chain topology
    this.connectNeighbors(id);

    return id;
  }

  /** Remove a belt at world coordinates. */
  removeBelt(worldX: number, worldY: number): void {
    const [gx, gy] = worldToGrid(worldX, worldY);
    const id = this.findBeltAt(gx, gy);
    if (!id) {
      return;
    }

    const belt = this.belts[id];
    if (!belt) {
      return;
    }

    // Destroy any items on this belt
    for (const side of ["left", "right"] as BeltSide[]) {
      const slots = side === "left" ? belt.leftSlots : belt.rightSlots;
      for (let i = 0; i < SLOT_COUNT; i++) {
        const itemId = slots[i];
        if (itemId) {
          this.removeItem(itemId);
        }
      }
    }

    // Disconnect neighbors
    const prev = belt.previousId ? this.belts[belt.previousId] : null;
    const next = belt.nextId ? this.belts[belt.nextId] : null;

    if (prev && prev.nextId === id) {
      prev.nextId = 0;
    }
    if (next && next.previousId === id) {
      next.previousId = 0;
    }

    this.spatialGrid.delete(gridKey(gx, gy));
    this.belts[id] = null as unknown as BeltState;
  }

  /** Add an item to a belt slot. */
  placeItem(
    beltWorldX: number,
    beltWorldY: number,
    side: BeltSide,
    slotIndex: number,
    itemType: string,
  ): ItemId | null {
    const [gx, gy] = worldToGrid(beltWorldX, beltWorldY);
    const beltId = this.findBeltAt(gx, gy);
    if (!beltId) {
      return null;
    }

    const belt = this.belts[beltId];
    if (!belt || belt.isTerminal) {
      return null;
    }

    const slots = side === "left" ? belt.leftSlots : belt.rightSlots;
    if (slots[slotIndex]) {
      return null; // Slot occupied
    }

    const itemId = this.nextItemIndex++ as ItemId;
    this.items[itemId] = {
      id: itemId,
      beltId,
      side,
      slotIndex,
      worldX: 0,
      worldY: 0,
    };

    slots[slotIndex] = itemId;
    return itemId;
  }

  // ── Reconstruction (from main thread snapshot) ───────────────────────────

  /** Reconstruct the entire belt layout from a list of placed belts. */
  reconstructFromLayout(layout: ReadonlyArray<{ x: number; y: number; variant?: BeltVariant }>): void {
    this.belts = new Array(INITIAL_BELT_COUNT);
    this.items = new Array(INITIAL_ITEM_CAPACITY);
    this.spatialGrid.clear();
    this.nextBeltIndex = 1;
    this.nextItemIndex = 1;
    this.tick = 0;

    // Pass 1: place all belts (temporary variants)
    const placedIds: BeltId[] = [];
    for (const { x, y } of layout) {
      const [gx, gy] = worldToGrid(x, y);
      const id = this.nextBeltIndex++;
      const key = gridKey(gx, gy);

      this.belts[id] = {
        id, variant: "horizontal-right" as BeltVariant, gx, gy,
        previousId: 0, nextId: 0,
        leftSlots: [0, 0, 0, 0],
        rightSlots: [0, 0, 0, 0],
        leftProgress: [0, 0, 0, 0],
        rightProgress: [0, 0, 0, 0],
        leftTailBlocked: false,
        rightTailBlocked: false,
        tailDir: "west",
        headDir: "east",
        isTerminal: false,
        isCurve: false,
      };
      this.spatialGrid.set(key, id);
      placedIds.push(id);
    }

    // Pass 2: resolve variants and chain connections
    // If explicit variants were provided, use those; otherwise auto-derive
    for (let i = 0; i < layout.length; i++) {
      const { variant } = layout[i]!;
      const id = placedIds[i]!;
      const belt = this.belts[id];
      if (!belt) continue;

      if (variant) {
        const flow = getFlow(variant);
        belt.variant = variant;
        belt.tailDir = flow[0];
        belt.headDir = flow[1];
        belt.isTerminal = !canStoreEntities(variant);
        belt.isCurve = isCurve(variant);
      }

      this.connectNeighbors(id);
    }

    // For belts without explicit variants, auto-derive
    for (let i = 0; i < layout.length; i++) {
      const { variant } = layout[i]!;
      if (!variant) {
        this.reshapeBelt(placedIds[i]!);
        this.connectNeighbors(placedIds[i]!);
      }
    }
  }

  // ── Tick ─────────────────────────────────────────────────────────────────

  /** Advance the simulation by one tick. Returns a snapshot of item positions. */
  update(): PositionSnapshot | null {
    this.tick++;

    // Find leaf belts (belts that no other belt points to as previous)
    // A belt is a leaf if it has no nextId and is pointed to by someone
    // or is not part of any chain (isolated)
    const leaves = this.findLeaves();
    const syncedBelts = new Set<BeltId>();

    for (const leafId of leaves) {
      // Walk chain from leaf → previous → previous → ... (headward)
      // Advance items in direction (from tail to head, i.e., toward nextId)
      // So we process from the start of the chain (furthest from leaf) toward the leaf
      const chain: BeltId[] = [];
      let current = leafId;
      while (current) {
        chain.push(current);
        const belt = this.belts[current];
        if (!belt) {
          break;
        }
        current = belt.previousId;
        if (current === leafId) break; // Loop guard
      }

      // chain[0] = leaf, chain[last] = chain start (furthest from leaf)
      // We need to advance from start→leaf for correct transfer semantics
      for (let i = chain.length - 1; i >= 0; i--) {
        this.advanceBelt(chain[i]);
        syncedBelts.add(chain[i]);
      }

      // Check for side-load at the leaf
      const sideLoad = this.resolveSideLoad(leafId);
      if (sideLoad) {
        this.executeSideLoad(sideLoad);
        syncedBelts.add(sideLoad.targetBeltId);
        syncedBelts.add(leafId);
      }
    }

    // Sync positions for affected belts
    for (const id of syncedBelts) {
      this.syncBeltItemPositions(id);
    }

    return this.buildSnapshot();
  }

  // ── Item removal ─────────────────────────────────────────────────────────

  private removeItem(itemId: ItemId): void {
    const item = this.items[itemId];
    if (!item) {
      return;
    }

    const belt = this.belts[item.beltId];
    if (belt) {
      const slots = item.side === "left" ? belt.leftSlots : belt.rightSlots;
      if (slots[item.slotIndex] === itemId) {
        slots[item.slotIndex] = 0;
      }
    }

    this.items[itemId] = null as unknown as ItemState;
  }

  // ── Spatial lookup ───────────────────────────────────────────────────────

  private findBeltAt(gx: GridCoord, gy: GridCoord): BeltId {
    return this.spatialGrid.get(gridKey(gx, gy)) ?? 0;
  }

  private findBeltInDirection(gx: GridCoord, gy: GridCoord, dir: BeltDirection): BeltId {
    const [nx, ny] = adjacentGrid(gx, gy, dir);
    return this.findBeltAt(nx, ny);
  }

  // ── Variant derivation ───────────────────────────────────────────────────

  /** Pick the best tail direction for a new belt based on neighbors. */
  private resolveBestTailDirection(gx: GridCoord, gy: GridCoord): BeltDirection {
    // Default: west (for horizontal-right)
    const defaultTail: BeltDirection = "west";
    const defaultHead = OPPOSITE_DIRECTION[defaultTail];

    // Check the 4 cardinal directions for incoming/outgoing belts
    const incoming: BeltDirection[] = [];
    const outgoing: BeltDirection[] = [];

    for (const dir of ["north", "east", "south", "west"] as BeltDirection[]) {
      const neighborId = this.findBeltInDirection(gx, gy, dir);
      if (!neighborId) {
        continue;
      }

      const neighbor = this.belts[neighborId];
      if (!neighbor || neighbor.isTerminal) {
        continue;
      }

      // If neighbor's head points toward us, it's incoming
      if (neighbor.headDir === OPPOSITE_DIRECTION[dir]) {
        incoming.push(dir);
      }

      // If neighbor's tail points toward us, it's outgoing (we feed into it)
      if (neighbor.tailDir === OPPOSITE_DIRECTION[dir]) {
        outgoing.push(dir);
      }
    }

    // If the default direction has an incoming belt → use default
    if (incoming.includes(defaultTail)) {
      return defaultTail;
    }

    // If exactly one direction has incoming → use it
    if (incoming.length === 1) {
      return incoming[0];
    }

    // If the default head has an outgoing belt → use default
    if (outgoing.includes(defaultHead)) {
      return defaultTail;
    }

    // Default
    return defaultTail;
  }

  /** Reshape a belt's variant based on neighbors. */
  private reshapeBelt(id: BeltId): void {
    const belt = this.belts[id];
    if (!belt) {
      return;
    }

    const tail = this.resolveBestTailDirection(belt.gx, belt.gy);
    const head = OPPOSITE_DIRECTION[tail];
    const variant = (getVariantByFlow(tail, head) ?? "horizontal-right") as BeltVariant;

    belt.variant = variant;
    belt.tailDir = tail;
    belt.headDir = head;
    belt.isTerminal = !canStoreEntities(variant);
    belt.isCurve = isCurve(variant);
  }

  // ── Chain topology ───────────────────────────────────────────────────────

  private connectNeighbors(id: BeltId): void {
    const belt = this.belts[id];
    if (!belt || belt.isTerminal) {
      return;
    }

    // Find neighbor at tail direction (previousId points toward us)
    const tailNeighbor = this.findBeltInDirection(belt.gx, belt.gy, belt.tailDir);
    if (tailNeighbor) {
      const neighbor = this.belts[tailNeighbor];
      if (neighbor && !neighbor.isTerminal) {
        // This neighbor's head should be pointing at us
        if (neighbor.headDir === OPPOSITE_DIRECTION[belt.tailDir]) {
          belt.previousId = tailNeighbor;
          neighbor.nextId = id;
        }
      }
    }

    // Find neighbor at head direction (we point to nextId)
    const headNeighbor = this.findBeltInDirection(belt.gx, belt.gy, belt.headDir);
    if (headNeighbor) {
      const neighbor = this.belts[headNeighbor];
      if (neighbor && !neighbor.isTerminal) {
        // This neighbor's tail should be pointing at us
        if (neighbor.tailDir === OPPOSITE_DIRECTION[belt.headDir]) {
          belt.nextId = headNeighbor;
          neighbor.previousId = id;
        }
      }
    }
  }

  /** Find all leaf belts. */
  private findLeaves(): BeltId[] {
    // A leaf is a belt that no other belt's previousId points to
    // AND has items in its slots (or is worth processing)
    // Simpler: a belt is a leaf if nextId === 0 and it can store entities
    const leaves: BeltId[] = [];
    const seen = new Set<BeltId>();

    for (let i = 0; i < this.belts.length; i++) {
      const belt = this.belts[i];
      if (!belt) {
        continue;
      }

      if (seen.has(belt.id)) {
        continue;
      }

      // Walk to the leaf end of the chain
      let current: BeltState | null = belt;
      let leaf: BeltId = belt.id;

      while (current) {
        seen.add(current.id);

        if (!current.nextId) {
          leaf = current.id;
          break;
        }

        current = this.belts[current.nextId];
        if (current && current.id === belt.id) {
          break; // Loop guard
        }
      }

      if (leaf && !seen.has(leaf)) {
        leaves.push(leaf);
      }
    }

    return leaves;
  }

  // ── Slot advancement ─────────────────────────────────────────────────────

  private advanceBelt(id: BeltId): void {
    const belt = this.belts[id];
    if (!belt || belt.isTerminal) {
      return;
    }

    const [, insideCurve] = getCurveLaneSides(belt.variant);
    const insideLane = insideCurve ?? "left";
    const leftTicks = insideLane === "left" ? SLOT_ADVANCE_TICKS / 2 : SLOT_ADVANCE_TICKS;
    const rightTicks = insideLane === "right" ? SLOT_ADVANCE_TICKS / 2 : SLOT_ADVANCE_TICKS;

    this.advanceLane(id, "left", leftTicks);
    this.advanceLane(id, "right", rightTicks);
  }

  private advanceLane(id: BeltId, side: BeltSide, slotTicks: number): void {
    const belt = this.belts[id];
    if (!belt) {
      return;
    }

    const slots = side === "left" ? belt.leftSlots : belt.rightSlots;
    const progress = side === "left" ? belt.leftProgress : belt.rightProgress;
    const progressDelta = 1 / slotTicks;
    const nextBelt = belt.nextId ? this.belts[belt.nextId] : null;

    let tailBlocked = false;

    // Process tail-first (slot 3 → 0)
    for (let slotIdx = SLOT_COUNT - 1; slotIdx >= 0; slotIdx--) {
      const itemId = slots[slotIdx];
      if (!itemId) {
        progress[slotIdx] = 0;
        continue;
      }

      const newProgress = progress[slotIdx] + progressDelta;

      if (newProgress >= 1) {
        const remaining = newProgress - 1;

        if (slotIdx === SLOT_COUNT - 1) {
          // At tail slot — try to transfer to next belt
          const transferred = this.tryTransfer(id, nextBelt, itemId, side, remaining);
          if (transferred) {
            slots[slotIdx] = 0;
            progress[slotIdx] = 0;
            continue;
          }

          tailBlocked = true;
          progress[slotIdx] = 1 - PROGRESS_SEAM_EPSILON;
        } else {
          // Move to next slot on same belt
          const nextSlot = slotIdx + 1;
          if (!slots[nextSlot]) {
            slots[nextSlot] = itemId;
            slots[slotIdx] = 0;
            progress[slotIdx] = 0;
            progress[nextSlot] = Math.min(remaining, 1 - PROGRESS_SEAM_EPSILON);

            this.items[itemId].slotIndex = nextSlot;
          } else {
            // Next slot is occupied — stall
            progress[slotIdx] = 1 - PROGRESS_SEAM_EPSILON;
          }
        }
      } else {
        progress[slotIdx] = newProgress;
      }
    }

    if (side === "left") {
      belt.leftTailBlocked = tailBlocked;
    } else {
      belt.rightTailBlocked = tailBlocked;
    }
  }

  private tryTransfer(
    fromId: BeltId,
    toBelt: BeltState | null,
    itemId: ItemId,
    side: BeltSide,
    remainingProgress: number,
  ): boolean {
    if (!toBelt || toBelt.isTerminal) {
      return false;
    }

    const toSlots = side === "left" ? toBelt.leftSlots : toBelt.rightSlots;
    if (toSlots[0]) {
      return false; // First slot occupied
    }

    // Transfer item
    toSlots[0] = itemId;

    const item = this.items[itemId];
    if (item) {
      item.beltId = toBelt.id;
      item.slotIndex = 0;
    }

    return true;
  }

  // ── Side-loading ─────────────────────────────────────────────────────────

  private resolveSideLoad(leafId: BeltId): {
    sourceBeltId: BeltId;
    targetBeltId: BeltId;
    targetLane: BeltSide;
  } | null {
    const belt = this.belts[leafId];
    if (!belt || belt.nextId !== 0 || belt.isTerminal) {
      return null;
    }

    // Look in the head direction for a belt to side-load into
    const targetId = this.findBeltInDirection(belt.gx, belt.gy, belt.headDir);
    if (!targetId) {
      return null;
    }

    const target = this.belts[targetId];
    if (!target || target.isTerminal || !isStraightFlow(getFlow(target.variant))) {
      return null;
    }

    // Determine which lane of the target to feed into
    // Cross product of this belt's flow and the approach direction
    const flow = getFlow(belt.variant);
    const targetFlow = getFlow(target.variant);
    const approachDir = OPPOSITE_DIRECTION[belt.headDir];

    // Which side of the target belt we're approaching from
    const targetTailDir = targetFlow[0];
    const cross = this.crossDirection(approachDir, targetTailDir);

    const targetLane: BeltSide = cross > 0 ? "right" : "left";

    return { sourceBeltId: leafId, targetBeltId: targetId, targetLane };
  }

  private crossDirection(a: BeltDirection, b: BeltDirection): number {
    // Map directions to normalized vectors and compute cross product Z
    const [ax, ay] = DIRECTION_OFFSETS[a];
    const [bx, by] = DIRECTION_OFFSETS[b];
    return ax * by - ay * bx;
  }

  private executeSideLoad(transfer: {
    sourceBeltId: BeltId;
    targetBeltId: BeltId;
    targetLane: BeltSide;
  }): void {
    const source = this.belts[transfer.sourceBeltId];
    const target = this.belts[transfer.targetBeltId];
    if (!source || !target) {
      return;
    }

    const targetSlots = transfer.targetLane === "left" ? target.leftSlots : target.rightSlots;
    const insertSlot = transfer.targetLane === "left" ? 1 : 2;

    if (targetSlots[insertSlot]) {
      return; // Slot occupied
    }

    // Try left lane of source, then right lane
    for (const side of ["left", "right"] as BeltSide[]) {
      const sourceSlots = side === "left" ? source.leftSlots : source.rightSlots;
      const tailItem = sourceSlots[SLOT_COUNT - 1];
      if (tailItem) {
        sourceSlots[SLOT_COUNT - 1] = 0;
        targetSlots[insertSlot] = tailItem;

        const item = this.items[tailItem];
        if (item) {
          item.beltId = transfer.targetBeltId;
          item.slotIndex = insertSlot;
        }
        return;
      }
    }
  }

  // ── Position sync ────────────────────────────────────────────────────────

  private syncBeltItemPositions(id: BeltId): void {
    const belt = this.belts[id];
    if (!belt) {
      return;
    }

    const [wx, wy] = gridToWorld(belt.gx, belt.gy);

    for (const side of ["left", "right"] as BeltSide[]) {
      const slots = side === "left" ? belt.leftSlots : belt.rightSlots;
      const progress = side === "left" ? belt.leftProgress : belt.rightProgress;

      for (let slotIdx = 0; slotIdx < SLOT_COUNT; slotIdx++) {
        const itemId = slots[slotIdx];
        if (!itemId) {
          continue;
        }

        this.resolveItemWorldPos(belt.variant, side, slotIdx, progress[slotIdx], wx, wy, this.sharedPos);

        const item = this.items[itemId];
        if (item) {
          item.worldX = this.sharedPos.x;
          item.worldY = this.sharedPos.y;
        }
      }
    }
  }

  /**
   * Resolve an item's world position from its belt variant, side, slot index, and progress.
   * Uses the same slot table as the production system.
   */
  private resolveItemWorldPos(
    variant: string,
    side: BeltSide,
    slotIdx: number,
    slotProgress: number,
    beltWorldX: number,
    beltWorldY: number,
    out: { x: number; y: number },
  ): void {
    const railProgress = (slotIdx + slotProgress) / SLOT_COUNT;
    const clampedRail = Math.max(0, Math.min(1, railProgress));
    this.resolvePositionOnRail(variant, side, clampedRail, beltWorldX, beltWorldY, out);
  }

  private resolvePositionOnRail(
    variant: string,
    side: BeltSide,
    railProgress: number,
    beltWorldX: number,
    beltWorldY: number,
    out: { x: number; y: number },
  ): void {
    const flow = getFlow(variant as BeltVariant);
    if (!flow) {
      out.x = beltWorldX;
      out.y = beltWorldY;
      return;
    }

    if (isStraightFlow(flow)) {
      this.resolveStraightPos(variant, flow, side, railProgress, beltWorldX, beltWorldY, out);
    } else {
      this.resolveCurvePos(variant, flow, side, railProgress, beltWorldX, beltWorldY, out);
    }
  }

  private resolveStraightPos(
    variant: string,
    flow: BeltFlow,
    side: BeltSide,
    railProgress: number,
    beltWorldX: number,
    beltWorldY: number,
    out: { x: number; y: number },
  ): void {
    const [tailDir] = flow;
    const slot0 = resolveSlotLocalPos(variant, side, 0);

    if (tailDir === "west" || tailDir === "east") {
      // Horizontal belt
      const [sx, , ex] = this.straightEdgePair(tailDir);
      out.x = beltWorldX + (sx + (ex - sx) * railProgress);
      out.y = beltWorldY + slot0[1];
    } else {
      // Vertical belt
      const [, sy, , ey] = this.straightEdgePair(tailDir);
      out.x = beltWorldX + slot0[0];
      out.y = beltWorldY + (sy + (ey - sy) * railProgress);
    }
  }

  private resolveCurvePos(
    variant: string,
    flow: BeltFlow,
    side: BeltSide,
    railProgress: number,
    beltWorldX: number,
    beltWorldY: number,
    out: { x: number; y: number },
  ): void {
    const [tailDir, headDir] = flow;
    const slot0 = resolveSlotLocalPos(variant, side, 0);

    // Curve center sits at the intersection of the two direction edges
    const cx = tailDir === "west" || tailDir === "east"
      ? (tailDir === "west" ? BELT_HALF_SIZE : -BELT_HALF_SIZE)
      : (headDir === "west" ? BELT_HALF_SIZE : -BELT_HALF_SIZE);

    const cy = tailDir === "north" || tailDir === "south"
      ? (tailDir === "north" ? BELT_HALF_SIZE : -BELT_HALF_SIZE)
      : (headDir === "north" ? BELT_HALF_SIZE : -BELT_HALF_SIZE);

    // Radius from center to slot 0
    const dx = slot0[0] - cx;
    const dy = slot0[1] - cy;
    const radius = Math.sqrt(dx * dx + dy * dy);

    // Start and end of the quarter-circle arc
    const startAngle = this.directionAngle(tailDir);
    const endAngle = this.directionAngle(headDir);

    // Quarter turn from tail to head (signed)
    let angleDelta = endAngle - startAngle;
    if (angleDelta > Math.PI) {
      angleDelta -= 2 * Math.PI;
    } else if (angleDelta < -Math.PI) {
      angleDelta += 2 * Math.PI;
    }

    const angle = startAngle + angleDelta * railProgress;
    out.x = beltWorldX + cx + Math.cos(angle) * radius;
    out.y = beltWorldY + cy + Math.sin(angle) * radius;
  }

  private directionAngle(dir: BeltDirection): number {
    switch (dir) {
      case "east": return 0;
      case "north": return -Math.PI / 2;
      case "west": return Math.PI;
      case "south": return Math.PI / 2;
    }
  }

  private straightEdgePair(tailDir: BeltDirection): readonly [number, number, number, number] {
    // Returns [startX, startY, endX, endY] for the linear rail
    switch (tailDir) {
      case "west": return [-BELT_HALF_SIZE, 0, BELT_HALF_SIZE, 0];
      case "east": return [BELT_HALF_SIZE, 0, -BELT_HALF_SIZE, 0];
      case "north": return [0, BELT_HALF_SIZE, 0, -BELT_HALF_SIZE];
      case "south": return [0, -BELT_HALF_SIZE, 0, BELT_HALF_SIZE];
    }
  }

  // ── Snapshot building ────────────────────────────────────────────────────

  private buildSnapshot(): PositionSnapshot | null {
    let count = 0;
    for (const item of this.items) {
      if (item) {
        count++;
      }
    }

    if (count === 0) {
      return null;
    }

    const positions = new Float32Array(count * 2);
    let idx = 0;
    for (const item of this.items) {
      if (!item) {
        continue;
      }

      positions[idx * 2] = item.worldX;
      positions[idx * 2 + 1] = item.worldY;
      idx++;
    }

    return { positions, itemCount: count, tick: this.tick };
  }
}
