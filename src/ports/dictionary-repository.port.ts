import type { EntrySummary, ThesaurusEntry } from "../types/dictionary";
import type { RhymeSearchParams, RhymeCandidate } from "../types/rhyme";

export interface IDictionaryRepository {
  // Fuzzy match a query string and return lightweight suggestions.
  fuzzySearch(query: string, limit?: number): Promise<EntrySummary[]>;

  // Get the full dictionary AST for a normalized headword.
  findEntry(word: string): Promise<ThesaurusEntry | null>;

  /**
   * Performs a comprehensive rhyming search using database-side scoring.
   */
  findRhymes(params: RhymeSearchParams): Promise<RhymeCandidate[]>;
}
