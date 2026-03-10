import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const GRID_CELL_SIZE = GridSingleton.cellSize;
export const BOX_SIZE = GRID_CELL_SIZE;
export const HALF_BOX_SIZE = GridSingleton.halfCellSize;

export const TRANSPORT_BELT_OFFSET_X = HALF_BOX_SIZE;
export const TRANSPORT_BELT_OFFSET_Y = HALF_BOX_SIZE;
export const TRANSPORT_BELT_COLLIDER_SIZE = GRID_CELL_SIZE;

export const DELETE_POINT_RADIUS = 0.001;