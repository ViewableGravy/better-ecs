import { Component } from "@engine";

export type PortalDestination = {
  x: number;
  y: number;
};

export class Portal extends Component {
  constructor(
    public readonly destination: PortalDestination,
    public readonly label?: string,
  ) {
    super();
  }
}
