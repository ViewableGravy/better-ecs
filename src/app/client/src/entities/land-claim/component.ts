/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

import { Component, StateComponent, state } from "@engine";

@StateComponent
export class LandClaim extends Component {
  @state("string")
  declare public ownerName: string;

  @state("float")
  declare public ownedRadiusTiles: number;

  @state("float")
  declare public buildableRadiusTiles: number;

  public constructor(ownerName: string, ownedRadiusTiles: number, buildableRadiusTiles: number) {
    super();
    this.ownerName = ownerName;
    this.ownedRadiusTiles = ownedRadiusTiles;
    this.buildableRadiusTiles = buildableRadiusTiles;
  }
}
