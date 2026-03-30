import Sqlite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { DB } from './types/database';
import { SqliteDictionaryRepository } from './adapters/sqlite-dictionary-repository';
import { createFuzzySearchFeature, createLookupFeature } from './features/lookup/lookup';
import { createSynonymFeature } from './features/synonyms/synonyms';
import { RhymeFeature, type RhymeOptions } from './features/rhyme/rhyme';

const dbPath = `${import.meta.dirname}/../data/database/wolff.sqlite`;

const db = new Kysely<DB>({
  dialect: new SqliteDialect({ 
    database: new Sqlite(dbPath, { readonly: true, fileMustExist: true }) 
  })
});

const repository = new SqliteDictionaryRepository(db);
const rhymeFeature = new RhymeFeature(repository);

export const lookup = createLookupFeature(repository);
export const fuzzySearch = createFuzzySearchFeature(repository);
export const getSynonyms = createSynonymFeature(repository);
export const getRhymes = (word: string, options?: RhymeOptions) => rhymeFeature.getRhymes(word, options);
