import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core';

export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  accessCode: text('access_code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const puzzles = pgTable('puzzles', {
  id: text('id').primaryKey(),
  stateData: jsonb('state_data').notNull(), // The JSON representation of the puzzle
  timeLimitSeconds: integer('time_limit_seconds'), // Optional
  isActive: boolean('is_active').default(true).notNull(),
  // Progression order (tutorial → easy → hard). Previously implicit in the
  // filename prefix (01-tut-01.json); the id itself drops that prefix, so
  // ordering has to be stored explicitly or the sequence scrambles.
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id').references(() => participants.id).notNull(),
  puzzleId: text('puzzle_id').references(() => puzzles.id).notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  totalTimeSeconds: integer('total_time_seconds'),
  isSolved: boolean('is_solved').default(false).notNull(),
}, (table) => [
  index('sessions_participant_id_idx').on(table.participantId),
  // The admin puzzle report groups sessions by puzzle; without this every
  // dashboard load is a sequential scan of the whole sessions table.
  index('sessions_puzzle_id_idx').on(table.puzzleId),
]);

export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  boardState: jsonb('board_state').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  attemptNumber: integer('attempt_number').notNull(),
  // check.ts's diagnoses[] for this attempt (which view failed, what kind of
  // mismatch, which region) — kept so struggle patterns can be analyzed
  // later without re-deriving them from boardState.
  diagnoses: jsonb('diagnoses'),
}, (table) => [
  index('attempts_session_id_idx').on(table.sessionId),
]);

export const hintUsages = pgTable('hint_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  attemptNumber: integer('attempt_number').notNull(),
  aiResponse: text('ai_response').notNull(),
}, (table) => [
  index('hint_usages_session_id_idx').on(table.sessionId),
]);
