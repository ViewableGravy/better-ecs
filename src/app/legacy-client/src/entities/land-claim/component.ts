/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

import { Component } from "@engine";
export class LandClaim extends Component {
  declare public ownerName: string;
  declare public ownedRadiusTiles: number;
  declare public buildableRadiusTiles: number;

  public constructor(ownerName: string, ownedRadiusTiles: number, buildableRadiusTiles: number) {
    super();
    this.ownerName = ownerName;
    this.ownedRadiusTiles = ownedRadiusTiles;
    this.buildableRadiusTiles = buildableRadiusTiles;
  }
}
