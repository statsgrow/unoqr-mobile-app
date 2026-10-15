export type DotStyle = "square" | "rounded" | "dots" | "classy" | "connected";//export ends

export type DotShapeInput = {
  x: number;
  y: number;
  col: number;
  row: number;
  color: string;
  hasNeighbor: (col: number, row: number) => boolean;
};//export ends

export type DotShapeBuilder = (input: DotShapeInput) => string;//export ends
