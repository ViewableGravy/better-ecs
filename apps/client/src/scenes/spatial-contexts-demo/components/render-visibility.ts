export type RenderVisibilityRole = "outside" | "house-roof" | "house-interior";

export class RenderVisibility {
  constructor(
    public role: RenderVisibilityRole,
    public baseAlpha: number = 1,
  ) {}
}
