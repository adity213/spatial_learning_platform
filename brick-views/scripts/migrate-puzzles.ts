import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in .env.local');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// Since scripts run as ES modules, we need __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const puzzlesDir = path.resolve(__dirname, '../src/data/puzzles');
  const files = fs.readdirSync(puzzlesDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} puzzles. Migrating...`);

  for (const file of files) {
    const content = fs.readFileSync(path.join(puzzlesDir, file), 'utf-8');
    const stateData = JSON.parse(content);
    // Key on the puzzle's own `id`, not the filename. Filenames carry an
    // ordering prefix (10-b-01.json) that the app never uses — the frontend
    // catalog and sessions.puzzle_id both reference the inner id (b-01), so
    // keying on the filename made every session insert fail its foreign key.
    const puzzleId: string = stateData.id;
    if (!puzzleId) {
      console.error(`❌ ${file} has no "id" field, skipping`);
      continue;
    }

    // The filename prefix (01-tut-01.json) is the only record of the intended
    // tutorial → hard progression, so carry it into sort_order before it's lost.
    const sortOrder = parseInt(file.match(/^(\d+)/)?.[1] ?? '0', 10);

    try {
      await db.insert(schema.puzzles).values({
        id: puzzleId,
        stateData: stateData,
        timeLimitSeconds: null,
        isActive: true,
        sortOrder
      }).onConflictDoUpdate({
        target: schema.puzzles.id,
        // Deliberately does not reset timeLimitSeconds/isActive — those are
        // edited from the admin panel and must survive a re-run of this script.
        set: { stateData, sortOrder }
      });
      console.log(`✅ Migrated ${puzzleId}`);
    } catch (e) {
      console.error(`❌ Failed to migrate ${puzzleId}:`, e);
    }
  }

  console.log('Migration complete!');
}

main().catch(console.error);
