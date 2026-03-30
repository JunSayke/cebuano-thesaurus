import type { IDictionaryRepository } from '../../ports/dictionary-repository.port.js';
import type { EntrySummary } from '../../types/dictionary';

const normalizeTranslation = (value: string): string => {
  let result = value.trim().toLowerCase();
  // Keep the first meaning before comma, drop sentence punctuation.
  result = result.split(',')[0].trim();
  result = result.replace(/[\.]+$/, '').trim();
  return result;
};

export const createSynonymFeature = (repo: IDictionaryRepository) => {
  return async (query: string | number, limit = 25): Promise<EntrySummary[]> => {
    const translations = Array.from(new Set(
      (await repo.findTranslations(query)).map(normalizeTranslation).filter(Boolean)
    ));

    if (translations.length === 0) {
      return [];
    }

    const candidates = await repo.findEntriesByTranslations(translations, limit * 4);

    // If query is a string, normalized for exact self-filter; if number, skip matching by name
    const targetNormalized = typeof query === 'string'
      ? query.toLowerCase().trim()
      : undefined;

    const scoreMap = new Map<string, { entry: EntrySummary; score: number }>();

    for (const candidate of candidates) {
      if (targetNormalized && candidate.normalizedHead === targetNormalized) continue;

      const candidateTranslations = new Set(candidate.translations.map(t => t.toLowerCase().trim()));
      const sharedCount = translations.filter(t => candidateTranslations.has(t)).length;
      if (sharedCount === 0) continue;

      const key = candidate.normalizedHead;
      const existing = scoreMap.get(key);
      if (!existing || sharedCount > existing.score) {
        scoreMap.set(key, { entry: candidate, score: sharedCount });
      }
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(v => v.entry);
  };
};


