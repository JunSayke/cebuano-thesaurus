import type { EntrySummary, ThesaurusEntry } from "../types/dictionary";
import type { RhymeSearchParams, RhymeCandidate } from "../types/rhyme";

export interface IDictionaryRepository {
  // Fuzzy match a query string and return lightweight suggestions.
  fuzzySearch(query: string, limit?: number): Promise<EntrySummary[]>;

  // Get the full dictionary AST for a normalized headword or entryid.
  findEntry(query: string | number): Promise<ThesaurusEntry | null>;

  // Get translations for a normalized headword or entryid.
  findTranslations(query: string | number): Promise<string[]>;

  // Get entries that share any of the given translations.
  findEntriesByTranslations(translations: string[], limit?: number): Promise<EntrySummary[]>;

  /**
   * Performs a comprehensive rhyming search using database-side scoring.
   */
  findRhymes(params: RhymeSearchParams): Promise<RhymeCandidate[]>;

  /**
   * Find anagrams of the given base word from the dictionary (excluding the word itself).
   */
  findAnagrams(word: string, limit?: number): Promise<EntrySummary[]>;
}
