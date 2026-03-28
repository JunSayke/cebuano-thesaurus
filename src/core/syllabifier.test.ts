import { expect, describe, it } from 'vitest';
import { Syllabifier } from './syllabifier';

describe('Syllabifier', () => {
  const syllabifier = new Syllabifier();

  describe('Syllable Counting', () => {
    it('accurately counts syllables for the +5 structural bonus', () => {
      expect(syllabifier.getSyllables('buang').syllables.length).toBe(2); // bu-ang
      expect(syllabifier.getSyllables('dagat').syllables.length).toBe(2); // da-gat
      expect(syllabifier.getSyllables('kabanang').syllables.length).toBe(3); // ka-ba-nang
      expect(syllabifier.getSyllables('kinabuang').syllables.length).toBe(4); // ki-na-bu-ang
    });
  });

  describe('splitSyllable', () => {
    it('accurately splits syllables into onset, nucleus, and coda', () => {
      // Perfect CV
      expect(syllabifier.splitSyllable('ba')).toEqual({ onset: 'b', nucleus: 'a', coda: '' });
      
      // Perfect CVC
      expect(syllabifier.splitSyllable('gat')).toEqual({ onset: 'g', nucleus: 'a', coda: 't' });
      
      // Vowel only
      expect(syllabifier.splitSyllable('a')).toEqual({ onset: '', nucleus: 'a', coda: '' });
      
      // Vowel + Coda
      expect(syllabifier.splitSyllable('ang')).toEqual({ onset: '', nucleus: 'a', coda: 'ng' });

      // Consonant cluster onset
      expect(syllabifier.splitSyllable('dyot')).toEqual({ onset: 'dy', nucleus: 'o', coda: 't' });
    });
  });
});
