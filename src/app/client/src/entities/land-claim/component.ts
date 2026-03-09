/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class LandClaim {
  public constructor(
    public ownerName: string,
    public ownedRadiusTiles: number,
    public buildableRadiusTiles: number,
  ) {}
}
