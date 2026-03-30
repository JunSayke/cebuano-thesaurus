import type { IDictionaryRepository } from '../../ports/dictionary-repository.port.js';
import type { EntrySummary, ThesaurusEntry } from '../../types/dictionary.js';

export const createLookupFeature = (repo: IDictionaryRepository) => {
  return async (query: string | number): Promise<ThesaurusEntry | null> => repo.findEntry(query);
};

export const createFuzzySearchFeature = (repo: IDictionaryRepository) => {
  return async (query: string, limit?: number): Promise<EntrySummary[]> => repo.fuzzySearch(query, limit);
}