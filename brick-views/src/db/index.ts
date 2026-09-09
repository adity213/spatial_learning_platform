import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import * as schema from './schema.js';

// Vercel injects DATABASE_URL in deployed environments, but `vercel dev` does
// not reliably inject it when it loads a function module locally — so read
// .env.local directly, same as drizzle.config.ts and scripts/ already do.
// dotenv never overrides an existing value, so deployed env vars still win.
dotenv.config({ path: '.env.local', quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
