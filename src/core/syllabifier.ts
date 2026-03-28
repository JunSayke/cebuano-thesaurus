/**
 * Cebuano Syllabifier
 * Breaks down Cebuano words into syllables based on CV(C) phonological patterns.
 *
 * Ported from: https://github.com/eemberda/Cebuano-Syllable-Decoder
 *
 * References:
 *   - M. V. R. Bunye and E. P. Yap, Cebuano Grammar Notes.
 *     University of Hawai'i Press, 1971.
 *   - Computational Linguistics @ Illinois. Syllable Script in Python, 2017.
 */

export interface SyllableResult {
  word: string;
  syllables: string[];
  patterns: string[];
}

export class Syllabifier {
  // -------------------------------------------------------------------------
  // Phoneme inventory
  // -------------------------------------------------------------------------

  private readonly vowelSet = new Set(['a', 'e', 'i', 'o', 'u']);

  private readonly consonantSet = new Set([
    'p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 'ng',
    's', 'h', 'l', 'r', 'w', 'y',
  ]);

  /**
   * Set used for O(1) lookup of two-consonant onset clusters.
   *
   * FIX (Bug 2): The original code rebuilt an object via Object.fromEntries()
   * on every character iteration and used the `in` operator to check membership.
   * A Set is allocated once and gives O(1) has() checks.
   */
  private readonly clusterSet = new Set([
    'pw', 'py', 'pr', 'pl',
    'tw', 'ty', 'tr', 'ts',
    'kw', 'ky', 'kr', 'kl',
    'bw', 'by', 'br', 'bl',
    'dw', 'dy', 'dr',
    'gw', 'gr',
    'mw', 'my',
    'nw', 'ny',
    'sw', 'sy',
    'hw',
  ]);

  // -------------------------------------------------------------------------
  // CV sequence builder
  // -------------------------------------------------------------------------

  /**
   * Converts a single (non-hyphenated) word segment into a CV sequence string.
   *
   * Rules applied in priority order for each character:
   *  1. Skip non-Cebuano characters.
   *  2. 'n' + 'g' → collapse into the 'ng' digraph (one C slot).
   *  3. 'ng' + consonant → emit C for the new consonant; 'ng' already owns its C.
   *  4. Any pending consonant + vowel → emit V, clear pending.
   *  5. Two-consonant cluster (e.g. 'pr', 'kw') → emit C for the cluster unit.
   *  6. Single consonant → emit C, mark as pending.
   *  7. Lone vowel (no pending consonant) → emit V.
   */
  private getCVSequence(segment: string): string {
    let cvSeq = '';
    let prevCons: string | null = null;

    for (const char of segment) {
      const isVowel = this.vowelSet.has(char);
      const isCons  = this.consonantSet.has(char);  // single chars only; 'ng' never matches here

      if (!isVowel && !isCons) {
        // Ignore punctuation, digits, spaces, etc.
        continue;
      } else if (prevCons === 'n' && char === 'g') {
        // Merge: absorb 'g' into the pending 'n' → 'ng' digraph.
        // The C slot was already emitted when 'n' was first processed.
        prevCons = 'ng';
      } else if (prevCons === 'ng' && isCons) {
        // 'ng' is fully resolved; the next consonant starts a new pending slot.
        cvSeq += 'C';
        prevCons = char;
      } else if (prevCons !== null && isVowel) {
        // Pending consonant (or digraph) + vowel → close with V.
        cvSeq += 'V';
        prevCons = null;
      } else if (prevCons !== null && this.clusterSet.has(prevCons + char)) {
        // Two-consonant onset cluster treated as a single C unit.
        cvSeq += 'C';
        prevCons = null;
      } else if (isCons) {
        cvSeq += 'C';
        prevCons = char;
      } else if (isVowel) {
        cvSeq += 'V';
        prevCons = null;
      }
    }

    return cvSeq;
  }

  // -------------------------------------------------------------------------
  // Syllabification rules
  // -------------------------------------------------------------------------

  /**
   * Inserts '-' syllable boundary markers into a raw CV sequence string.
   *
   * Rules are applied in priority order; the pass restarts after every
   * substitution — mirroring the Python `while X in s: s = s.replace(X, Y)`.
   */
  private applySyllableRules(seq: string): string {
    // More specific / longer patterns must precede shorter overlapping ones.
    const rules: ReadonlyArray<[RegExp, string]> = [
      [/CVCCV/,  'CVC-CV'],
      [/VCV/,    'V-CV'],
      [/VV/,     'V-V'],
      [/CCVCCV/, 'CCVC-CV'],
      [/CCVCV/,  'CCV-CV'],
      [/VCC/,    'VC-C'],
      [/CVCV/,   'CV-CV'],
      [/VVC/,    'V-VC'],
    ];

    let s = seq;
    let changed = true;

    while (changed) {
      changed = false;
      for (const [pattern, replacement] of rules) {
        const next = s.replace(pattern, replacement);
        if (next !== s) {
          s = next;
          changed = true;
          break; // Restart the pass — same semantics as nested while-loops.
        }
      }
    }

    return s;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Accepts a Cebuano word (optionally hyphenated for affixed forms) and
   * returns the syllable list together with CV pattern strings.
   *
   * @example
   * getSyllables("buang")
   * // { word: "buang", syllables: ["bu","ang"], patterns: ["CV","VC"] }
   *
   * @example
   * getSyllables("tinabangay")
   * // { syllables: ["ti","na","ba","ngay"], patterns: ["CV","CV","CV","CVC"] }
   *
   * @example
   * getSyllables("mag-tinabangay")
   * // { syllables: ["mag","ti","na","ba","ngay"], patterns: ["CVC","CV","CV","CV","CVC"] }
   *
   * @example
   * getSyllables("mangaon")
   * // { syllables: ["ma","nga","on"], patterns: ["CV","CV","VC"] }
   */
  getSyllables(word: string): SyllableResult {
    const lowerWord = word.toLowerCase().trim();
    const syllables: string[] = [];
    const patterns: string[] = [];

    // Hyphenated words (mag-__, pag-__, etc.) are segmented independently.
    const parts = lowerWord.split('-').filter(Boolean);

    for (const part of parts) {
      const rawSeq    = this.getCVSequence(part);
      const segmented = this.applySyllableRules(rawSeq);
      const sylSeqArr = segmented.split('-');

      patterns.push(...sylSeqArr);

      /**
       * Map each CV token back to the actual characters in `part`.
       *
       * FIX (Bug 1 — the "buang" bug):
       *
       * The original code used:
       *   for (let j = 0; j < cv.length - 1; j++) { ... check w[charIndex+j] for 'ng' }
       *
       * For a "VC" slot (length = 2) the loop runs j = 0..0 only, so it checks
       * position charIndex+0 for 'n' and charIndex+1 for 'g'. But in "buang",
       * the syllable "ang" has 'n' at position 3 and 'g' at position 4 — that
       * is j=1, which the loop never reaches. Result: "an" instead of "ang".
       *
       * The Python source does:
       *   if "ng" in w[i : i + chars + 1]:
       *       syllables.append(w[i : i + chars + 1])
       *
       * Equivalent fix: check whether 'ng' appears anywhere in the slice
       * [charIndex .. charIndex + cv.length + 1] (the syllable characters plus
       * one lookahead for the second byte of the digraph).
       */
      let charIndex = 0;
      for (const cv of sylSeqArr) {
        const lookahead      = part.substring(charIndex, charIndex + cv.length + 1);
        const syllableLength = lookahead.includes('ng') ? cv.length + 1 : cv.length;

        syllables.push(part.substring(charIndex, charIndex + syllableLength));
        charIndex += syllableLength;
      }
    }

    return { word: lowerWord, syllables, patterns };
  }

  // -------------------------------------------------------------------------
  // Convenience helpers
  // -------------------------------------------------------------------------

  /**
   * Syllabify each whitespace-separated token in a string.
   */
  segmentText(text: string): SyllableResult[] {
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => this.getSyllables(token));
  }

  /** Returns the last syllable of a word. */
  getLastSyllable(word: string): string {
    const { syllables } = this.getSyllables(word);
    return syllables[syllables.length - 1] ?? '';
  }

  /**
   * Splits a syllable into onset (initial consonant(s)), nucleus (vowel(s)),
   * and coda (trailing consonant(s)).
   */
  splitSyllable(syllable: string): { onset: string; nucleus: string; coda: string } {
    const s = syllable.toLowerCase();
    let vowelStart = -1;
    let vowelEnd   = -1;

    for (let i = 0; i < s.length; i++) {
      if (this.vowelSet.has(s[i])) {
        if (vowelStart === -1) vowelStart = i;
        vowelEnd = i;
      }
    }

    if (vowelStart === -1) {
      return { onset: '', nucleus: '', coda: s }; // No vowel — entire syllable is coda.
    }

    return {
      onset:   s.substring(0, vowelStart),
      nucleus: s.substring(vowelStart, vowelEnd + 1),
      coda:    s.substring(vowelEnd + 1),
    };
  }

  /**
   * Returns the abstract pattern of a syllable (e.g. "CV", "CVC", "V", "VC").
   * Note: onset consonant clusters (e.g. "ng", "pr") are collapsed to a single C.
   */
  getSyllablePattern(syllable: string): string {
    const { onset, nucleus, coda } = this.splitSyllable(syllable);
    return (onset ? 'C' : '') + (nucleus ? 'V' : '') + (coda ? 'C' : '');
  }

  /**
   * Returns true if the syllable contains at least one vowel (minimum validity).
   */
  isValidSyllable(syllable: string): boolean {
    return [...syllable.toLowerCase()].some((c) => this.vowelSet.has(c));
  }
}