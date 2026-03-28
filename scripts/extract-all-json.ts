import Sqlite from 'better-sqlite3';
import { writeFileSync } from 'fs';
import path from 'path';
import { parseEntryXml } from '../src/utils/parseEntryXml';

const dbPath = path.resolve(import.meta.dirname, '../data/database/wolff.sqlite');
const db = new Sqlite(dbPath, { readonly: true });

console.log('Reading all entries from database...');
const rows = db.prepare('SELECT entry FROM wced_entry').all() as { entry: string }[];

console.log(`Parsing ${rows.length} entries...`);
const allEntries = rows.map(row => {
  try {
    return parseEntryXml(row.entry);
  } catch (e) {
    return null;
  }
}).filter(Boolean);

const outputPath = path.resolve(import.meta.dirname, '../data/all-entries.json');
writeFileSync(outputPath, JSON.stringify(allEntries));

console.log(`✅ Success! Data saved to ${outputPath}`);