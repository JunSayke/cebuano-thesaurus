import type { IDictionaryRepository } from '../../ports/dictionary-repository.port.js';

export const createLookupFeature = (repo: IDictionaryRepository) => {
  return async (word: string) => repo.findEntry(word);
};

export const createFuzzySearchFeature = (repo: IDictionaryRepository) => {
  return async (query: string, limit?: number) => repo.fuzzySearch(query, limit);
}