import { create } from "zustand";
import { brickAtCell } from "../core/geometry";
import { canPlace, canRemove } from "../core/placement";
import { derivePuzzle } from "../core/puzzle";
import { getCatalog } from "../core/catalog";
import { check } from "../core/check";
import type {
  CheckResult,
  DerivedPuzzle,
  PieceTypeId,
  Placement,
  Puzzle,
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

  // Participant/telemetry state. `accessCode` is kept in memory (never
  // persisted) so a new backend Session row can be opened each time the
  // puzzle changes, without asking the participant to re-enter their code.
  accessCode: string | null;
  participantName: string | null;
  currentSessionId: string | null;
  authLoading: boolean;
  authError: string | null;

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
  login(accessCode: string): Promise<void>;
  startBuilder(puzzle: Puzzle): void;
}

/** Authoring tray size. A puzzle's normal tray is exactly its solution's
 *  tally, which is right for a child and useless for designing — the author
 *  needs bricks that aren't in the solution yet. */
const BUILDER_TRAY = 99;

/** Opens a backend Session row for (accessCode, puzzleId). Returns null on
 *  any failure (bad code, network error) — callers decide how to react. */
async function requestSession(
  accessCode: string,
  puzzleId: string
): Promise<{ sessionId: string; participantName: string } | null> {
  try {
    const res = await fetch("/api/start-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode, puzzleId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { sessionId: data.sessionId, participantName: data.participantName };
  } catch {
    return null;
  }
}

// Read once at import. main.tsx installs the fetched catalogue before it
// imports App, so this is already the live list by the time it runs.
const catalog = getCatalog();
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

  accessCode: null,
  participantName: null,
  currentSessionId: null,
  authLoading: false,
  authError: null,

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
      // No attempts get logged until the new puzzle's session resolves below.
      currentSessionId: null,
    });

    const { accessCode } = get();
    if (accessCode) {
      requestSession(accessCode, puzzle.id).then((result) => {
        // The participant may have switched puzzles again before this
        // resolved — don't let a stale response overwrite the current one.
        if (result && get().derived.puzzle.id === puzzle.id) {
          set({ currentSessionId: result.sessionId });
        }
      });
    }
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
    const { placed, derived, attempts, currentSessionId } = get();
    const result = check(placed, derived);

    let nextAttempts = attempts;
    if (result.outcome !== "empty") {
      // `attemptNumber` is the Nth check click on this puzzle, sent to the
      // backend as-is. `nextAttempts` is the local hint-ladder counter,
      // which resets to 0 on solve — the two diverge only on that outcome.
      const attemptNumber = attempts + 1;
      nextAttempts = result.outcome === "solved" ? 0 : attemptNumber;
      saveAttempts(derived.puzzle.id, nextAttempts);

      if (currentSessionId) {
        fetch("/api/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId,
            boardState: placed,
            isCorrect: result.outcome === "solved",
            attemptNumber,
            diagnoses: result.diagnoses,
          }),
        }).catch(() => {
          // Telemetry only — a dropped attempt log must never block play.
        });
      }
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

  /** Loads a puzzle into the store for authoring rather than playing: the
   *  solution starts on the board (so an existing puzzle can be tweaked) and
   *  the tray is effectively unlimited. Everything else — placement legality,
   *  rotation, erase mode, the 3D scene — is the child's board unchanged,
   *  which is the point: you author in exactly what they'll see. */
  startBuilder(puzzle) {
    const derived = derivePuzzle(puzzle);
    const remaining = { ...derived.tray };
    for (const typeId of Object.keys(remaining) as PieceTypeId[]) {
      remaining[typeId] = BUILDER_TRAY;
    }

    set({
      derived,
      placed: puzzle.solution,
      remaining,
      selectedType: null,
      rotation: 0,
      mode: "build",
      lastCheck: null,
      lastReject: null,
      showMismatch: false,
      attempts: 0,
      // Authoring must never write telemetry as though a child played.
      currentSessionId: null,
    });
  },

  async login(accessCode) {
    set({ authLoading: true, authError: null });
    const puzzleId = get().derived.puzzle.id;
    const result = await requestSession(accessCode, puzzleId);

    if (!result) {
      set({ authLoading: false, authError: "That code didn't work. Check it and try again." });
      return;
    }

    set({
      accessCode,
      participantName: result.participantName,
      currentSessionId: result.sessionId,
      authLoading: false,
      authError: null,
    });
  },
}));
