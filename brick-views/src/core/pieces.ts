import type { ColorId, PieceType, PieceTypeId, ShapeId } from "./types";

export const SHAPES: Record<ShapeId, { width: number; depth: number }> = {
  "1x1": { width: 1, depth: 1 },
  "1x2": { width: 1, depth: 2 },
  "1x3": { width: 1, depth: 3 },
  "1x4": { width: 1, depth: 4 },
  "2x2": { width: 2, depth: 2 },
  "2x3": { width: 2, depth: 3 },
  "2x4": { width: 2, depth: 4 },
  "2x6": { width: 2, depth: 6 },
};

/** Display/selection order. Also the tie-break for tray ordering. */
export const COLOR_ORDER: ColorId[] = ["red", "blue", "yellow", "green", "white"];

const COLOR_HEX: Record<ColorId, string> = {
  red: "#E3000B",
  blue: "#1F7AE0",
  yellow: "#F4B71E",
  green: "#2E9E4F",
  white: "#F2F4F7",
};

/** One neutral hex for every brick in a `monochrome` puzzle. Reuses the
 *  existing "generic filled" token rather than adding a 6th colour. */
export const MONOCHROME_HEX = "#48566A";

function capitalize(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1);
}

export function shapeLabel(shape: ShapeId): string {
  const { width, depth } = SHAPES[shape];
  return `${width} × ${depth}`;
}

function buildPieces(): Record<PieceTypeId, PieceType> {
  const pieces = {} as Record<PieceTypeId, PieceType>;
  for (const shape of Object.keys(SHAPES) as ShapeId[]) {
    for (const color of COLOR_ORDER) {
      const id = `${shape}-${color}` as PieceTypeId;
      pieces[id] = Object.freeze({
        id,
        shape,
        color,
        width: SHAPES[shape].width,
        depth: SHAPES[shape].depth,
        hex: COLOR_HEX[color],
        label: `${capitalize(color)} ${shapeLabel(shape)}`,
      });
    }
  }
  return Object.freeze(pieces);
}

export const PIECES: Record<PieceTypeId, PieceType> = buildPieces();

/** typeId → shape-only label ("2 × 4"), used for a `monochrome` puzzle where
 *  naming a colour the puzzle doesn't show would be misleading. */
export function shapeOnlyLabel(typeId: PieceTypeId): string {
  return shapeLabel(PIECES[typeId].shape);
}

/** Present types (count > 0) in a tray, ordered by footprint area
 *  descending then by COLOR_ORDER — the display order for the tray and the
 *  1-9 keyboard shortcuts. Core, not UI, so both share one implementation. */
export function orderedTypeIds(tray: Partial<Record<PieceTypeId, number>>): PieceTypeId[] {
  return (Object.keys(tray) as PieceTypeId[])
    .filter((id) => (tray[id] ?? 0) > 0)
    .sort((a, b) => {
      const pa = PIECES[a];
      const pb = PIECES[b];
      const areaDiff = pb.width * pb.depth - pa.width * pa.depth;
      if (areaDiff !== 0) return areaDiff;
      return COLOR_ORDER.indexOf(pa.color) - COLOR_ORDER.indexOf(pb.color);
    });
}
