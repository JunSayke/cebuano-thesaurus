import { Syllabifier } from '../../core/syllabifier';
import { VOWEL_PAIRS, getAllConsonants, consonantSimilarity } from '../../core/phonetics';
import type { IDictionaryRepository } from '../../ports/dictionary-repository.port';
import type { RhymeCandidate, RhymeSearchParams } from '../../types/rhyme';

export interface RhymeOptions {
  limit?: number;
  offset?: number;
  maxSyllableOffset?: number;
  randomness?: number; // 0.0 to 1.0
}

export class RhymeFeature {
  private syllabifier: Syllabifier;

  constructor(private repository: IDictionaryRepository) {
    this.syllabifier = new Syllabifier();
  }

  /**
   * Finds rhymes for a given word by orchestrating phonetics and database lookups.
   */
  async getRhymes(word: string, options: RhymeOptions = {}): Promise<RhymeCandidate[]> {
    const { limit = 25, offset = 0, maxSyllableOffset, randomness = 0 } = options;
    
    // Analyze the input word
    const { syllables } = this.syllabifier.getSyllables(word);
    console.log(syllables, "Syllables for input word:", word);
    if (syllables.length === 0) return [];

    const targetSyllableCount = syllables.length;
    const lastSyllable = syllables[targetSyllableCount - 1];
    const { nucleus, coda } = this.syllabifier.splitSyllable(lastSyllable);

    // Determine Phonetic Variants
    const allophoneNuclei = this.getVowelVariants(nucleus);
    const similarCodas = this.getSimilarCodas(coda);

    // Execute Scored Database Search
    const searchParams: RhymeSearchParams = {
      targetNucleus: nucleus,
      targetCoda: coda,
      targetSyllableCount,
      allophoneNuclei,
      similarCodas,
      limit: limit + 5, // Fetch slightly more to account for input word filtering
      offset,
      maxSyllableOffset
    };

    let rhymes = await this.repository.findRhymes(searchParams);

    // Post-processing: Filter out the input word itself
    const normalizedInput = word.toLowerCase().trim();
    rhymes = rhymes.filter(r => r.normalizedHead !== normalizedInput);

    // Apply Jitter if requested
    if (randomness > 0) {
      rhymes = rhymes.map(r => {
        const jitter = (Math.random() * 2 - 1) * r.score * Math.min(Math.max(randomness, 0), 1);
        return { ...r, score: r.score + jitter };
      });

      // Re-sort if jitter was applied
      rhymes.sort((a, b) => b.score - a.score);
    }

    return rhymes.slice(0, limit);
  }

  private getVowelVariants(vowel: string): string[] {
    const variants = new Set([vowel]);
    for (const [v1, v2] of VOWEL_PAIRS) {
      if (vowel === v1) variants.add(v2);
      if (vowel === v2) variants.add(v1);
    }
    return Array.from(variants);
  }

  private getSimilarCodas(coda: string): string[] {
    if (!coda) return [];
    // Filter all known consonants for those that share phonetic features with the target coda
    return getAllConsonants().filter(c => consonantSimilarity(coda, c) > 0);
  }
}