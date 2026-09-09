import { create } from "zustand";
import { brickAtCell } from "../core/geometry";
import { canPlace, canRemove } from "../core/placement";
import { derivePuzzle, loadPuzzles } from "../core/puzzle";
import { check } from "../core/check";
import type {
  CheckResult,
  DerivedPuzzle,
  PieceTypeId,
  Placement,
  RejectReason,
  Rotation,
  Vec3,
} from "../core/types";

interface Session {
  derived: DerivedPuzzle;
  placed: Placement[];
  remaining: Record<PieceTypeId, number>;
  selectedType: PieceTypeId | null;
  rotation: Rotation;
  mode: "build" | "erase";
  lastCheck: CheckResult | null;
  lastReject: RejectReason | null;
  puzzleIndex: number;
  puzzleCount: number;
  puzzleList: { id: string; name: string }[];
  attempts: number;
  showMismatch: boolean;

  loadPuzzle(id: string): void;
  selectType(id: PieceTypeId | null): void;
  rotateCW(): void;
  place(origin: Vec3): void;
  removeAt(cell: Vec3): void;
  clearBoard(): void;
  runCheck(): void;
  dismissFeedback(): void;
  nextPuzzle(): void;
  prevPuzzle(): void;
  setShowMismatch(): void;
}

const catalog = loadPuzzles();
const firstPuzzle = catalog[0];
if (!firstPuzzle) throw new Error("No puzzles found under src/data/puzzles.");

function indexOf(id: string): number {
  return catalog.findIndex((p) => p.id === id);
}

function findPuzzle(id: string) {
  const puzzle = catalog.find((p) => p.id === id);
  if (!puzzle) throw new Error(`No puzzle with id "${id}".`);
  return puzzle;
}

function getAttempts(puzzleId: string): number {
  try {
    const val = sessionStorage.getItem(`attempts-${puzzleId}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

function saveAttempts(puzzleId: string, attempts: number): void {
  try {
    if (attempts === 0) {
      sessionStorage.removeItem(`attempts-${puzzleId}`);
    } else {
      sessionStorage.setItem(`attempts-${puzzleId}`, attempts.toString());
    }
  } catch {}
}

const initialDerived = derivePuzzle(firstPuzzle);

export const useSession = create<Session>((set, get) => ({
  derived: initialDerived,
  placed: [],
  remaining: { ...initialDerived.tray },
  selectedType: null,
  rotation: 0,
  mode: "build",
  lastCheck: null,
  lastReject: null,
  puzzleIndex: 0,
  puzzleCount: catalog.length,
  puzzleList: catalog.map((p) => ({ id: p.id, name: p.name })),
  attempts: getAttempts(firstPuzzle.id),
  showMismatch: false,

  loadPuzzle(id) {
    const puzzle = findPuzzle(id);
    const derived = derivePuzzle(puzzle);
    set({
      derived,
      placed: [],
      remaining: { ...derived.tray },
      selectedType: null,
      rotation: 0,
      mode: "build",
      lastCheck: null,
      lastReject: null,
      puzzleIndex: indexOf(puzzle.id),
      puzzleCount: catalog.length,
      attempts: getAttempts(puzzle.id),
      showMismatch: false,
    });
  },

  selectType(id) {
    set({ selectedType: id });
  },

  rotateCW() {
    set((state) => ({ rotation: ((state.rotation + 90) % 360) as Rotation }));
  },

  place(origin) {
    const { selectedType, rotation, placed, derived, remaining } = get();
    if (!selectedType) return;

    const result = canPlace(placed, derived.puzzle.board, remaining, selectedType, rotation, origin);
    if (!result.ok) {
      set({ lastReject: result.reason });
      return;
    }

    const placement: Placement = {
      instanceId: crypto.randomUUID(),
      typeId: selectedType,
      rotation,
      origin,
    };

    set({
      placed: [...placed, placement],
      remaining: { ...remaining, [selectedType]: remaining[selectedType] - 1 },
      lastCheck: null,
      lastReject: null,
    });
  },

  removeAt(cell) {
    const { placed, remaining } = get();
    const brick = brickAtCell(placed, cell);
    if (!brick) return;

    const result = canRemove(placed, brick.instanceId);
    if (!result.ok) {
      set({ lastReject: result.reason });
      return;
    }

    set({
      placed: placed.filter((p) => p.instanceId !== brick.instanceId),
      remaining: { ...remaining, [brick.typeId]: remaining[brick.typeId] + 1 },
      lastCheck: null,
      lastReject: null,
    });
  },

  clearBoard() {
    const { derived } = get();
    saveAttempts(derived.puzzle.id, 0);
    set({
      placed: [],
      remaining: { ...derived.tray },
      lastCheck: null,
      lastReject: null,
      attempts: 0,
      showMismatch: false,
    });
  },

  runCheck() {
    const { placed, derived, attempts } = get();
    const result = check(placed, derived);
    
    let nextAttempts = attempts;
    if (result.outcome !== "empty") {
      if (result.outcome === "solved") {
        nextAttempts = 0;
      } else {
        nextAttempts = attempts + 1;
      }
      saveAttempts(derived.puzzle.id, nextAttempts);
    }
    
    set({ lastCheck: result, attempts: nextAttempts, showMismatch: false });
  },

  dismissFeedback() {
    set({ lastCheck: null, lastReject: null });
  },

  nextPuzzle() {
    const { puzzleIndex, loadPuzzle } = get();
    const next = catalog[(puzzleIndex + 1) % catalog.length];
    if (next) loadPuzzle(next.id);
  },

  prevPuzzle() {
    const { puzzleIndex, loadPuzzle } = get();
    const prev = catalog[(puzzleIndex - 1 + catalog.length) % catalog.length];
    if (prev) loadPuzzle(prev.id);
  },

  setShowMismatch() {
    set({ showMismatch: true });
  },
}));
