export type HouseWallSegment = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HouseDoorway = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HouseLayout = {
  wallSegments: readonly HouseWallSegment[];
  doorway: HouseDoorway;
};

type HouseLayoutOptions = {
  wallThickness?: number;
  doorHeight?: number;
  playerDiameter?: number;
};

export function createHouseLayout(
  halfWidth: number,
  halfHeight: number,
  options: HouseLayoutOptions = {},
): HouseLayout {
  const wallThickness = options.wallThickness ?? 6;
  const doorWidth = wallThickness;
  const playerDiameter = options.playerDiameter ?? 32;
  const doorHeight = options.doorHeight ?? Math.round(playerDiameter * 1.2);

  const interiorWidth = halfWidth * 2;
  const interiorHeight = halfHeight * 2;
  const sideSegmentHeight = Math.max(1, (interiorHeight - doorHeight) * 0.5);

  const leftWallX = -halfWidth + wallThickness * 0.5;
  const rightWallX = halfWidth - wallThickness * 0.5;
  const topWallY = -halfHeight + wallThickness * 0.5;
  const bottomWallY = halfHeight - wallThickness * 0.5;

  const leftUpperY = -(doorHeight * 0.5 + sideSegmentHeight * 0.5);
  const leftLowerY = doorHeight * 0.5 + sideSegmentHeight * 0.5;

  return {
    wallSegments: [
      { x: 0, y: topWallY, width: interiorWidth, height: wallThickness },
      { x: 0, y: bottomWallY, width: interiorWidth, height: wallThickness },
      { x: rightWallX, y: 0, width: wallThickness, height: interiorHeight },
      { x: leftWallX, y: leftUpperY, width: wallThickness, height: sideSegmentHeight },
      { x: leftWallX, y: leftLowerY, width: wallThickness, height: sideSegmentHeight },
    ],
    doorway: {
      x: leftWallX,
      y: 0,
      width: doorWidth,
      height: doorHeight,
    },
  };
}