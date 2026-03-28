import type { EntrySummary, ThesaurusEntry } from "../types/dictionary";

export interface IDictionaryRepository {
  // Fuzzy match a query string and return lightweight suggestions.
  fuzzySearch(query: string, limit?: number): Promise<EntrySummary[]>;

  // Get the full dictionary AST for a normalized headword.
  findEntry(word: string): Promise<ThesaurusEntry | null>;
}
