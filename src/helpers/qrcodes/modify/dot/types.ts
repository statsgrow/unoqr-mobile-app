export type DotStyle = "square" | "rounded" | "dots" | "classy" | "connected";

export type DotShapeInput = {
  x: number;
  y: number;
  col: number;
  row: number;
  color: string;
  hasNeighbor: (col: number, row: number) => boolean;
};

export type DotShapeBuilder = (input: DotShapeInput) => string;
