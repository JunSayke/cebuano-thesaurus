import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../data/database/wolff.sqlite');

const db = new Database(dbPath);

const normalizeForSortedChars = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/gi, '')
    .split('')
    .sort()
    .join('');

console.log('Fetching entries from wced_head...');
const rows = db
  .prepare('SELECT _id, head, normalized_head FROM wced_head WHERE normalized_head IS NOT NULL')
  .all() as { _id: number; head: string; normalized_head: string }[];

console.log(`Processing ${rows.length} entries...`);

const updateStmt = db.prepare(`
  UPDATE wced_head
  SET metadata = jsonb(json_patch(COALESCE(metadata, '{}'), ?))
  WHERE _id = ?
`);

const updateMany = db.transaction((updates: { payload: string; id: number }[]) => {
  for (const update of updates) {
    updateStmt.run(update.payload, update.id);
  }
});

const updates: { payload: string; id: number }[] = [];
let skipped = 0;

for (const row of rows) {
  const clean = row.normalized_head?.toString();
  if (!clean) {
    skipped++;
    continue;
  }

  const sortedChars = normalizeForSortedChars(clean);
  if (!sortedChars) {
    skipped++;
    continue;
  }

  updates.push({
    payload: JSON.stringify({ sortedChars }),
    id: row._id
  });
}

console.log(`Updating ${updates.length} entries (Skipped: ${skipped})...`);
updateMany(updates);
console.log('✅ sortedChars values populated in metadata successfully!');
