/** Typed fetch layer for /api/admin/*. Every call relies on the browser's
 *  native Basic Auth prompt (triggered by the server's 401 challenge) —
 *  there is no token to attach here. */

import type { BoardSize, Placement } from "../core/types";

export interface ParticipantSummary {
  id: string;
  name: string;
  accessCode: string;
  createdAt: string;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  totalTimeSeconds: number;
  hintsUsed: number;
  lastActiveAt: string | null;
}

export interface TimelineAttemptEvent {
  type: "attempt";
  timestamp: string;
  attemptNumber: number;
  isCorrect: boolean;
  diagnoses: unknown;
}

export interface TimelineHintEvent {
  type: "hint";
  timestamp: string;
  attemptNumber: number;
  aiResponse: string;
}

export type TimelineEvent = TimelineAttemptEvent | TimelineHintEvent;

export interface ParticipantSession {
  id: string;
  puzzleId: string;
  puzzleName: string;
  startedAt: string;
  completedAt: string | null;
  totalTimeSeconds: number | null;
  isSolved: boolean;
  timeline: TimelineEvent[];
}

export interface ParticipantDetail {
  id: string;
  name: string;
  accessCode: string;
  sessions: ParticipantSession[];
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AdminApiError(res.status, body.error ?? "Request failed");
  }
  return res.json();
}

export function fetchParticipants(): Promise<{ participants: ParticipantSummary[] }> {
  return adminFetch("/api/admin/participants");
}

export function createParticipant(name: string): Promise<ParticipantSummary> {
  return adminFetch("/api/admin/participants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function fetchParticipantDetail(id: string): Promise<ParticipantDetail> {
  return adminFetch(`/api/admin/participant?id=${encodeURIComponent(id)}`);
}

export interface PuzzleSummary {
  id: string;
  name: string;
  hint: string;
  monochrome: boolean;
  bricks: number;
  board: BoardSize;
  solution: Placement[];
  timeLimitSeconds: number | null;
  isActive: boolean;
  sortOrder: number;

  timesPlayed: number;
  distinctParticipants: number;
  timesSolved: number;
  totalAttempts: number;
  medianAttemptsToSolve: number | null;
  medianSolveSeconds: number | null;
}

/** Fields a teacher may change. Anything omitted is left untouched, so a
 *  form can send only what it edited. */
export interface PuzzleUpdate {
  name?: string;
  hint?: string;
  monochrome?: boolean;
  timeLimitSeconds?: number | null;
  isActive?: boolean;
  /** Geometry. Server re-runs validatePuzzle + validateColourRules and
   *  rejects anything unsolvable or colour-unfair, so a 400 here is a real
   *  design problem to show the author, not a transport error. */
  solution?: Placement[];
  board?: BoardSize;
}

export interface NewPuzzle {
  id: string;
  name: string;
  hint: string;
  board: BoardSize;
  solution: Placement[];
  monochrome?: boolean;
  timeLimitSeconds?: number | null;
}

export function createPuzzle(puzzle: NewPuzzle): Promise<{ success: true; id: string }> {
  return adminFetch("/api/admin/puzzles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(puzzle),
  });
}

export function fetchPuzzleStats(): Promise<{ puzzles: PuzzleSummary[] }> {
  return adminFetch("/api/admin/puzzles");
}

export function updatePuzzle(id: string, changes: PuzzleUpdate): Promise<{ success: true }> {
  return adminFetch("/api/admin/puzzles", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...changes }),
  });
}
