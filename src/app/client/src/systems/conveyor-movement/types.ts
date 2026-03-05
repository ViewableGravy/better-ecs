import { Vec2 } from "@engine";

export type Side = "left" | "right" | "top" | "bottom";

export type BeltFlow = {
	type: "straight";
	direction: Vec2;
} | {
	type: "curve";
	from: Side;
	to: Side;
};
