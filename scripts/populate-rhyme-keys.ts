import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Syllabifier } from '../src/core/syllabifier';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../data/database/wolff.sqlite');

const db = new Database(dbPath);
const syllabifier = new Syllabifier();

console.log('Fetching entries from wced_head...');
const rows = db.prepare('SELECT _id, head FROM wced_head WHERE head IS NOT NULL').all() as { _id: number, head: string }[];

console.log(`Processing ${rows.length} entries...`);

const updateStmt = db.prepare(`
  UPDATE wced_head 
  SET metadata = jsonb(json_patch(COALESCE(metadata, '{}'), ?)) 
  WHERE _id = ?
`);

const updateMany = db.transaction((updates: { payload: string, id: number }[]) => {
  for (const update of updates) {
    updateStmt.run(update.payload, update.id);
  }
});

const updates = [];
let skipped = 0;

for (const row of rows) {
  try {
    const result = syllabifier.getSyllables(row.head);
    if (!result.syllables || result.syllables.length === 0) {
      skipped++;
      continue;
    }

    const syllableCount = result.syllables.length;
    const lastSyllable = result.syllables[syllableCount - 1];
    const { onset, nucleus, coda } = syllabifier.splitSyllable(lastSyllable);

    const patch = {
      syllableCount,
      rhyme: {
        syllable: lastSyllable,
        onset,
        nucleus,
        coda
      }
    };

    updates.push({
      payload: JSON.stringify(patch),
      id: row._id
    });

  } catch (err) {
    skipped++;
  }
}

console.log(`Updating ${updates.length} entries (Skipped: ${skipped})...`);
updateMany(updates);
console.log('✅ Rhyme keys and syllable counts populated successfully!');
