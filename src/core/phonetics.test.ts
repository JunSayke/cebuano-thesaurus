import { expect, describe, it } from 'vitest';
import { vowelsMatch, consonantSimilarity, getAllConsonants } from './phonetics';

describe('vowelsMatch', () => {
  it('matches identical vowels', () => {
    expect(vowelsMatch('a', 'a')).toBe(true);
    expect(vowelsMatch('u', 'u')).toBe(true);
  });

  it('matches acceptable vowel pairs (u/o, i/e)', () => {
    expect(vowelsMatch('u', 'o')).toBe(true);
    expect(vowelsMatch('o', 'u')).toBe(true);
    expect(vowelsMatch('i', 'e')).toBe(true);
    expect(vowelsMatch('e', 'i')).toBe(true);
  });

  it('rejects mismatched vowels', () => {
    expect(vowelsMatch('a', 'i')).toBe(false);
    expect(vowelsMatch('o', 'e')).toBe(false);
  });
});

describe('consonantSimilarity', () => {
  it('returns 1.0 for identical consonants', () => {
    expect(consonantSimilarity('k', 'k')).toBe(1.0);
    expect(consonantSimilarity('ng', 'ng')).toBe(1.0);
  });

  it('returns 1.0 for consonants in the same phonetic feature group', () => {
    // Both are stops
    expect(consonantSimilarity('p', 'b')).toBe(1.0);
    expect(consonantSimilarity('t', 'k')).toBe(1.0);
    
    // Both are nasals
    expect(consonantSimilarity('m', 'ng')).toBe(1.0);
  });

  it('returns 0 for consonants in different feature groups', () => {
    // Stop vs Nasal
    expect(consonantSimilarity('p', 'm')).toBe(0);
    
    // Fricative vs Approximant
    expect(consonantSimilarity('s', 'w')).toBe(0);
  });

  it('handles unknown or empty consonants safely', () => {
    expect(consonantSimilarity('x', 'p')).toBe(0);
    expect(consonantSimilarity('', 't')).toBe(0);
  });
});

describe('getAllConsonants', () => {
  it('returns the list of mapped consonants', () => {
    const consonants = getAllConsonants();
    expect(consonants).toContain('p');
    expect(consonants).toContain('ng');
    expect(consonants.length).toBeGreaterThan(10); // Ensures our map is populated
  });
});
