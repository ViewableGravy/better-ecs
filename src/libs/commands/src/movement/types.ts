/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type MovementAxis = -1 | 0 | 1;

export type MovementMoveCommand = {
  type: "movement:move";
  x: MovementAxis;
  y: MovementAxis;
};

export type MovementCommand = MovementMoveCommand;