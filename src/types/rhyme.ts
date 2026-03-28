import type { EntrySummary } from "./dictionary";

export interface RhymeCandidate extends EntrySummary {
  score: number;
  syllableCount: number;
  rhymeType: 'perfect' | 'family' | 'additive' | 'assonance';
  rhyme: {
    syllable: string;
    onset: string;
    nucleus: string;
    coda: string;
  };
}

export interface RhymeSearchParams {
  targetNucleus: string;
  targetCoda: string;
  targetSyllableCount: number;
  allophoneNuclei: string[];     // e.g. ['u', 'o']
  similarCodas: string[];        // e.g. ['m', 'n', 'ng']
  limit?: number;
  offset?: number;
  maxSyllableOffset?: number;    // e.g. 1 means targetCount +/- 1
}