import Sqlite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { DB } from './types/database';
import { SqliteDictionaryRepository } from './adapters/sqlite-dictionary-repository';
import { createFuzzySearchFeature, createLookupFeature } from './features/lookup/lookup';
import { createSynonymFeature } from './features/synonyms/synonyms';
import { createAnagramFeature } from './features/anagrams/anagrams';
import { RhymeFeature, type RhymeOptions } from './features/rhyme/rhyme';
import { Syllabifier, type SyllableResult } from './core/syllabifier';
import { Stemmer, type StemResult } from './core/stemmer';

const dbPath = `${import.meta.dirname}/../data/database/wolff.sqlite`;

const db = new Kysely<DB>({
  dialect: new SqliteDialect({ 
    database: new Sqlite(dbPath, { readonly: true, fileMustExist: true }) 
  })
});

const repository = new SqliteDictionaryRepository(db);
const rhymeFeature = new RhymeFeature(repository);
const anagramFeature = createAnagramFeature(repository);

// Feature Exports
export const lookup = createLookupFeature(repository);
export const fuzzySearch = createFuzzySearchFeature(repository);
export const getSynonyms = createSynonymFeature(repository);
export const getAnagrams = (word: string, limit?: number) => anagramFeature(word, limit);
export const getRhymes = (word: string, options?: RhymeOptions) => rhymeFeature.getRhymes(word, options);

// Export core modules for direct consumer use
export { Stemmer, type StemResult, Syllabifier, type SyllableResult };