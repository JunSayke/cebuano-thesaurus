/**
 * Cebuano Syllabifier
 * Breaks down Cebuano words into syllables
 * Based on CV(C) phonological patterns
 * Ported from: https://github.com/eemberda/Cebuano-Syllable-Decoder
 */

export interface SyllableResult {
  word: string;
  syllables: string[];
  patterns: string[];
}

export class Syllabifier {
  private readonly vowels = ['a', 'e', 'i', 'o', 'u'];
  private readonly consonants = ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 'ng', 's', 'h', 'l', 'r', 'w', 'y'];
  private readonly consonantClusters = [
    'pw', 'py', 'pr', 'pl', 'tw', 'ty', 'tr', 'ts', 'kw', 'ky', 'kr', 'kl',
    'bw', 'by', 'br', 'bl', 'dw', 'dy', 'dr', 'gw', 'gr', 'mw', 'my', 'nw', 'ny', 'sw', 'sy', 'hw'
  ];

  /**
   * Get CV sequence for a word
   * Converts word into pattern of Consonants (C) and Vowels (V)
   */
  private getCVSequence(word: string): string {
    const lowerWord = word.toLowerCase();
    let prevCons: string | null = null;
    let cvSeq = '';

    for (const char of lowerWord) {
      // Skip invalid characters
      if (!this.vowels.includes(char) && !this.consonants.includes(char)) {
        continue;
      }

      // Handle 'ng' digraph
      if (prevCons === 'n' && char === 'g') {
        prevCons = 'ng';
        continue;
      } else if (prevCons === 'ng' && this.consonants.includes(char)) {
        prevCons = char;
        cvSeq += 'C';
      }
      // Consonant followed by vowel
      else if (prevCons && this.vowels.includes(char)) {
        cvSeq += 'V';
        prevCons = null;
      }
      // Consonant cluster
      else if (prevCons && prevCons + char in Object.fromEntries(
        this.consonantClusters.map((c) => [c, true])
      )) {
        cvSeq += 'C';
        prevCons = null;
      }
      // Single consonant
      else if (this.consonants.includes(char)) {
        cvSeq += 'C';
        prevCons = char;
      }
      // Vowel
      else if (this.vowels.includes(char)) {
        cvSeq += 'V';
        prevCons = null;
      }
    }

    return cvSeq;
  }

  /**
   * Extract syllables from a Cebuano word
   * Uses CV(C) pattern matching rules to determine syllable boundaries
   */
  getSyllables(word: string): SyllableResult {
    const lowerWord = word.toLowerCase().trim();
    const syllables: string[] = [];
    const patterns: string[] = [];

    const words = lowerWord.split('-').filter(Boolean);

    for (const w of words) {
      let sylSeq = this.getCVSequence(w);

      // Apply syllable boundary rules (order matters)
      while (sylSeq.includes('CVCCV')) {
        sylSeq = sylSeq.replace('CVCCV', 'CVC-CV');
      }
      while (sylSeq.includes('VCV')) {
        sylSeq = sylSeq.replace('VCV', 'V-CV');
      }
      while (sylSeq.includes('VV')) {
        sylSeq = sylSeq.replace('VV', 'V-V');
      }
      while (sylSeq.includes('CCVCCV')) {
        sylSeq = sylSeq.replace('CCVCCV', 'CCVC-CV');
      }
      while (sylSeq.includes('CCVCV')) {
        sylSeq = sylSeq.replace('CCVCV', 'CCV-CV');
      }
      while (sylSeq.includes('VCC')) {
        sylSeq = sylSeq.replace('VCC', 'VC-C');
      }
      while (sylSeq.includes('CVCV')) {
        sylSeq = sylSeq.replace('CVCV', 'CV-CV');
      }
      while (sylSeq.includes('VVC')) {
        sylSeq = sylSeq.replace('VVC', 'V-VC');
      }

      const sylSeqArr = sylSeq.split('-');

      // Map patterns and extract actual syllables
      for (const cv of sylSeqArr) {
        patterns.push(cv);
      }

      // Extract syllables from word based on CV patterns
      let charIndex = 0;
      for (const cv of sylSeqArr) {
        let syllableLength = cv.length;

        // Check if there's an 'ng' digraph anywhere in this pattern
        // by looking ahead for 'ng' within the syllable length
        for (let j = 0; j < cv.length - 1; j++) {
          const checkIndex = charIndex + j;
          if (checkIndex + 1 < w.length && w[checkIndex] === 'n' && w[checkIndex + 1] === 'g') {
            // 'ng' found - increase syllable length by 1
            syllableLength += 1;
            break;
          }
        }

        const syllable = w.substring(charIndex, charIndex + syllableLength);
        syllables.push(syllable);
        charIndex += syllableLength;
      }
    }

    return {
      word: lowerWord,
      syllables,
      patterns,
    };
  }

  /**
   * Segment multi-word input and syllabify each token separately
   */
  segmentText(text: string): SyllableResult[] {
    return text
      .split(/[\s]+/)
      .filter(Boolean)
      .map((token) => this.getSyllables(token));
  }

  /**
   * Get last syllable of a word
   */
  getLastSyllable(word: string): string {
    const result = this.getSyllables(word);
    return result.syllables[result.syllables.length - 1] || '';
  }

  /**
   * Split syllable into onset (initial consonant), nucleus (vowel), and coda (final consonant(s))
   */
  splitSyllable(syllable: string): {
    onset: string;
    nucleus: string;
    coda: string;
  } {
    const syllableLower = syllable.toLowerCase();
    let onset = '';
    let nucleus = '';
    let coda = '';

    let vowelStart = -1;
    let vowelEnd = -1;

    // Find vowel position
    for (let i = 0; i < syllableLower.length; i++) {
      if (this.vowels.includes(syllableLower[i])) {
        if (vowelStart === -1) {
          vowelStart = i;
        }
        vowelEnd = i;
      }
    }

    if (vowelStart === -1) {
      // No vowel found, treat whole as coda
      coda = syllableLower;
    } else {
      onset = syllableLower.substring(0, vowelStart);
      nucleus = syllableLower.substring(vowelStart, vowelEnd + 1);
      coda = syllableLower.substring(vowelEnd + 1);
    }

    return { onset, nucleus, coda };
  }

  /**
   * Detect syllable pattern (CV, CVC, V, VC, etc.)
   */
  getSyllablePattern(syllable: string): string {
    const { onset, nucleus, coda } = this.splitSyllable(syllable);

    let pattern = '';
    if (onset) pattern += 'C';
    pattern += 'V';
    if (coda) pattern += 'C';

    return pattern;
  }

  /**
   * Validate if a syllable follows valid Cebuano patterns
   */
  isValidSyllable(syllable: string): boolean {
    const pattern = this.getSyllablePattern(syllable);
    // Valid patterns: V, CV, VC, CVC, CCV, VCC, CCVC, CVCC (rare), etc.
    // Minimum requirement: must have a vowel
    return pattern.includes('V');
  }
}
