export type Vec3 = { x: number; y: number; z: number };
export type Rotation = 0 | 90 | 180 | 270;

/** Footprint only. All shapes are rectangles, 1 unit tall. */
export type ShapeId = "1x1" | "1x2" | "1x3" | "1x4" | "2x2" | "2x3" | "2x4" | "2x6";
export type ColorId = "red" | "blue" | "yellow" | "green" | "white";
/** "<shape>-<color>", e.g. "2x4-yellow". Composite so every existing
 *  Record<PieceTypeId, number> tray keeps working unchanged. */
export type PieceTypeId = `${ShapeId}-${ColorId}`;

export interface PieceType {
  id: PieceTypeId;
  shape: ShapeId;
  color: ColorId;
  width: number;   // along x at rotation 0
  depth: number;   // along z at rotation 0
  hex: string;      // render colour
  label: string;    // "Red 2 × 4" — colour word first, spec §9
}

export interface Placement {
  instanceId: string;
  typeId: PieceTypeId;
  rotation: Rotation;
  origin: Vec3;    // min-corner cell after rotation
}

export interface BoardSize { width: number; depth: number; height: number }

export interface Puzzle {
  id: string;
  name: string;
  hint: string;
  board: BoardSize;
  solution: Placement[];
  /** true → every brick renders one neutral grey; colour is never graded. */
  monochrome?: boolean;
  /** Optional countdown shown to the participant. Set per puzzle from the
   *  admin panel; stored in its own DB column, merged in by /api/puzzles. */
  timeLimitSeconds?: number;
}

/** "x,y,z" keys */
export type CellSet = Set<string>;
/** "a,b" keys, meaning depends on the view — see spec §2 */
export type ViewSet = Set<string>;

export interface Views { front: ViewSet; right: ViewSet; top: ViewSet }
export type ViewName = keyof Views;

/** "a,b" (same key space as ViewSet) → the colour of the nearest brick there. */
export type ColorMap = Map<string, ColorId>;
export interface ColorViews { front: ColorMap; right: ColorMap; top: ColorMap }

export interface DerivedPuzzle {
  puzzle: Puzzle;
  cells: CellSet;
  views: Views;
  colorViews: ColorViews;
  /** row-major booleans, already in display orientation */
  viewGrids: Record<ViewName, boolean[][]>;
  tray: Record<PieceTypeId, number>;
}

export type RejectReason =
  | "out-of-bounds"
  | "overlap"
  | "unsupported"
  | "none-left"
  | "load-bearing";   // removal only

export type PlaceResult = { ok: true } | { ok: false; reason: RejectReason };

export type CheckOutcome = "solved" | "hidden-brick" | "views-mismatch" | "empty";

/** Ranked coarsest-first — index 0 is the vaguest true thing that can be said
 *  about the mismatch. Never names a brick; at most names a view and a region. */
export type DiagnosisCode =
  | "brick-count-low"
  | "brick-count-high"
  | "footprint-wrong"           // top silhouette differs
  | "height-wrong"               // tallest layer differs
  | "shape-right-colour-wrong"   // all 3 silhouettes match, >=1 colour view doesn't
  | "colour-swap"                 // colour multiset matches, positions don't
  | "hidden-brick"                // views all match, cell sets don't
  | "region-mismatch";             // + which view, + a bounding box in that view

export interface DiagnosisRegion {
  rowFrom: number;
  rowTo: number;
  colFrom: number;
  colTo: number;
}

export interface Diagnosis {
  code: DiagnosisCode;
  view?: ViewName;
  /** bounding box of mismatched cells, in that view's DISPLAY grid coords */
  region?: DiagnosisRegion;
}

export interface CheckResult {
  outcome: CheckOutcome;
  views: Record<ViewName, boolean>;
  bricksPlaced: number;
  bricksTotal: number;
  /** ranked coarsest-first; empty when solved */
  diagnoses: Diagnosis[];
  /** A single cell in the child's coordinate space that is incorrect or missing. Used for Rung 5. */
  mismatchedCell?: Vec3;
}
