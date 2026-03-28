import Sqlite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { DB } from './types/database';
import { SqliteDictionaryRepository } from './adapters/sqlite-dictionary-repository';
import { createFuzzySearchFeature, createLookupFeature } from './features/lookup/lookup';

const dbPath = `${import.meta.dirname}/../data/database/wolff.sqlite`;

const db = new Kysely<DB>({
  dialect: new SqliteDialect({ 
    database: new Sqlite(dbPath, { readonly: true, fileMustExist: true }) 
  })
});

const repository = new SqliteDictionaryRepository(db);

export const lookup = createLookupFeature(repository);
export const fuzzySearch = createFuzzySearchFeature(repository);
