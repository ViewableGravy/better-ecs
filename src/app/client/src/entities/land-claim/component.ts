/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

import { Serializable, serializable } from "@engine";

export class LandClaim extends Serializable {
  @serializable("string")
  public ownerName: string;

  @serializable("float")
  public ownedRadiusTiles: number;

  @serializable("float")
  public buildableRadiusTiles: number;

  public constructor(ownerName: string, ownedRadiusTiles: number, buildableRadiusTiles: number) {
    super();
    this.ownerName = ownerName;
    this.ownedRadiusTiles = ownedRadiusTiles;
    this.buildableRadiusTiles = buildableRadiusTiles;
  }
}
