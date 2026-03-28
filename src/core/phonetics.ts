/**
 * Cebuano Phonetics Module
 * Handles phonetic similarity, features, and vowel pairs for advanced rhyme matching.
 */

export const VOWEL_PAIRS: [string, string][] = [
  ['u', 'o'],
  ['i', 'e']
];

// Group consonants by phonetic features for similarity scoring.
// Adapted for standard Cebuano orthography (no IPA symbols needed).
const CONSONANT_GROUPS: Record<string, string[]> = {
  stops: ['p', 'b', 't', 'd', 'k', 'g'],
  fricatives: ['s', 'h'],
  nasals: ['m', 'n', 'ng'],
  approximants: ['w', 'y', 'l', 'r'],
};

const consonantFeatures = new Map<string, Set<string>>();

for (const [feature, consonants] of Object.entries(CONSONANT_GROUPS)) {
  for (const c of consonants) {
    if (!consonantFeatures.has(c)) {
      consonantFeatures.set(c, new Set());
    }
    consonantFeatures.get(c)!.add(feature);
  }
}

export function getAllConsonants(): string[] {
  return Array.from(consonantFeatures.keys());
}

/**
 * Calculates the phonetic similarity between two consonants (0.0 to 1.0)
 * based on their shared phonetic features.
 */
export function consonantSimilarity(c1: string, c2: string): number {
  if (c1 === c2) return 1.0;

  const features1 = consonantFeatures.get(c1);
  const features2 = consonantFeatures.get(c2);

  if (!features1 || !features2) {
    return 0;
  }

  const intersection = Array.from(features1).filter(f => features2.has(f)).length;
  const union = new Set([...features1, ...features2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Checks if two vowels match, including acceptable pairs like u/o and i/e.
 */
export function vowelsMatch(v1: string, v2: string): boolean {
  if (v1 === v2) return true;

  for (const [vowel1, vowel2] of VOWEL_PAIRS) {
    if ((v1 === vowel1 && v2 === vowel2) || (v1 === vowel2 && v2 === vowel1)) {
      return true;
    }
  }

  return false;
}
