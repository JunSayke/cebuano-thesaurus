import Sqlite from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { Kysely, SqliteDialect, Migrator, FileMigrationProvider } from 'kysely';

const dir = import.meta.dirname;
const dbPath = path.resolve(dir, '../data/database/wolff.sqlite');
const migrationsPath = path.resolve(dir, '../data/database/migrations');

const db = new Kysely<any>({
  dialect: new SqliteDialect({ database: new Sqlite(dbPath) })
});

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: migrationsPath,
  }),
});

const { error, results } = await migrator.migrateToLatest();

results?.forEach(it => console.log(`${it.migrationName}: ${it.status}`));
if (error) console.error('Migration failed:', error);

await db.destroy();