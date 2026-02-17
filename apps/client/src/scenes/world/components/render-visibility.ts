import { Tagged } from 'type-fest';

/**
 * Visibility roles using tagged numbers for performance optimization.
 * Tagged numbers avoid string comparison overhead in render systems.
 */

export type RenderVisibilityRole = Tagged<number, "RenderVisibilityRole">;

function createVisibilityRole(id: number): RenderVisibilityRole {
  return id as RenderVisibilityRole;
}

export const OUTSIDE = createVisibilityRole(1);
export const HOUSE_ROOF = createVisibilityRole(2);
export const HOUSE_INTERIOR = createVisibilityRole(3);

export class RenderVisibility {
  constructor(
    public role: RenderVisibilityRole,
    public baseAlpha: number = 1,
  ) {}
}

