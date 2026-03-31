import db from 'better-sqlite3';
import { readFileSync, existsSync, unlinkSync } from 'fs';

const dir = import.meta.dirname;
console.log(dir)
const dbPath = `${dir}/../data/database/wolff.sqlite`;

if (existsSync(dbPath)) unlinkSync(dbPath); // remove existing db if it exists, to start fresh
const sql = new db(dbPath);

const read = (f: string) => readFileSync(`${dir}/../phildict/Data/Wolff/SQL/${f}.sql`, 'utf8');

// 1. Load Structure
sql.exec(read('structure-sqlite'));

// 2. Convert and Load Data
[...'ABDGHIKLMNPRSTUWY', 'addenda'].forEach(f => 
  sql.exec(read(f).replace(/`/g, '').replace(/"((?:[^"]|"")*)"/gs, (_, i) => 
    `'${i.replace(/""/g, '"').replace(/'/g, "''")}'`
  ))
);

// 3. Verify
['entry', 'head'].forEach(t => 
  console.log(t, (sql.prepare(`SELECT COUNT(*) c FROM wced_${t}`).get() as any).c)
);

// 4. Force SQLite out of WAL mode before saving the final file
console.log('Converting database out of WAL mode for read-only distribution...');
sql.pragma('journal_mode = DELETE');

sql.close(); // Ensure everything is flushed to the single .sqlite file
console.log('Done.');