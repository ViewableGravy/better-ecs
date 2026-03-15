/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

import { Component, SerializableComponent, serializable } from "@engine";

@SerializableComponent
export class LandClaim extends Component {
  @serializable("string")
  declare public ownerName: string;

  @serializable("float")
  declare public ownedRadiusTiles: number;

  @serializable("float")
  declare public buildableRadiusTiles: number;

  public constructor(ownerName: string, ownedRadiusTiles: number, buildableRadiusTiles: number) {
    super();
    this.ownerName = ownerName;
    this.ownedRadiusTiles = ownedRadiusTiles;
    this.buildableRadiusTiles = buildableRadiusTiles;
  }
}
