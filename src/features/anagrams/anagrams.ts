import type { IDictionaryRepository } from '../../ports/dictionary-repository.port.js';
import type { EntrySummary } from '../../types/dictionary';

export const createAnagramFeature = (repo: IDictionaryRepository) => {
  return async (query: string, limit = 25): Promise<EntrySummary[]> => {
    if (!query.trim()) {
      return [];
    }

    return repo.findAnagrams(query, limit);
  };
};
