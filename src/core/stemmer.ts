/**
 * Cebuano Stemmer based on Krovetz Algorithm
 * Strips prefixes, suffixes, infixes, and reduplication
 * Adapted from rjrequina/Cebuano-Stemmer
 */

export interface StemResult {
  original: string;
  root: string;
  prefix: string | null;
  infix: string | null;
  suffix: string | null;
  reduplication: boolean;
}

const PREFIXES = [
  'gipang', 'pinaka', 'isigka', 'inigka', 'tigpa', 'pagka', 'panag', 'manga',
  'magka', 'ting', 'tagi', 'taga', 'pina', 'pani', 'pang', 'pala', 'ning',
  'nang', 'naka', 'mang', 'mala', 'maki', 'maka', 'kina', 'hing', 'ging',
  'nihi', 'gihi', 'nahi', 'kada', 'tig', 'tag', 'sag', 'pan', 'pag', 'nag',
  'man', 'mag', 'ika', 'hin', 'pa', 'ni', 'na', 'mo', 'ma', 'ka', 'in',
  'ig', 'hi', 'gi', 'ga', 'ba', 'mu'
];

const SUFFIXES = [
  'syon', 'ista', 'ante', 'anan', 'non', 'ito', 'ita', 'ing', 'hon', 'hay',
  'han', 'ero', 'era', 'dor', 'ano', 'ado', 'ada', 'oy', 'ot', 'on',
  'it', 'hi', 'ha', 'es', 'da', 'ay', 'ar', 'an'
];

const INFIXES = ['in', 'um'];

export class Stemmer {
  /**
   * Stem a Cebuano word and return root with affixes
   */
  stem(word: string): StemResult {
    const original = word;
    // Normalize: lowercase and keep only letters (strip hyphens, spaces, diacritics separately)
    let root = word.toLowerCase().replace(/[^a-zñáéíóúàèìòùâêîôûäëïöü]/g, '');
    
    // If root is too short after normalization, return original
    if (root.length < 3) {
      return {
        original,
        root: word.toLowerCase(),
        prefix: null,
        infix: null,
        suffix: null,
        reduplication: false,
      };
    }

    let prefix: string | null = null;
    let infix: string | null = null;
    let suffix: string | null = null;
    let reduplication = false;

    // Prefer prefix stripping before infix-only passes so longer prefixes win
    const processes: Array<Array<'inf' | 'pref' | 'suff' | 'redup'>> = [
      [],
      ['pref'],
      ['inf'],
      ['pref', 'inf'],
      ['redup'],
      ['pref', 'redup'],
      ['inf', 'redup'],
      ['pref', 'inf', 'redup'],
      ['suff'],
      ['pref', 'suff'],
      ['inf', 'suff'],
      ['pref', 'inf', 'suff'],
      ['redup', 'suff'],
      ['pref', 'redup', 'suff'],
      ['inf', 'redup', 'suff'],
      ['pref', 'inf', 'suff', 'redup']
    ];

    // Evaluate all processes and pick the best candidate instead of stopping at first match
    let bestCandidate: {
      root: string;
      prefix: string | null;
      infix: string | null;
      suffix: string | null;
      redup: boolean;
      score: number;
    } | null = null;

    for (const process of processes) {
      let tempRoot = root;
      let tempPrefix: string | null = null;
      let tempInfix: string | null = null;
      let tempSuffix: string | null = null;
      let tempRedup = false;

      for (const step of process) {
        if (step === 'pref') {
          const result = this.stripPrefix(tempRoot);
          // stripPrefix may remove multiple stacked prefixes, but reports only the first
          tempRoot = result.root;
          if (result.prefix) tempPrefix = result.prefix;
        } else if (step === 'suff') {
          const result = this.stripSuffix(tempRoot);
          tempRoot = result.root;
          if (result.suffix) tempSuffix = result.suffix;
        } else if (step === 'inf') {
          const result = this.stripInfix(tempRoot);
          tempRoot = result.root;
          if (result.infix) tempInfix = result.infix;
        } else if (step === 'redup') {
          const result = this.removeDuplication(tempRoot);
          tempRoot = result.root;
          tempRedup = result.reduced;
        }
      }

      const strippedSomething = tempRoot !== root;
      if (tempRoot.length >= 3 && strippedSomething) {
        const affixCount = (tempPrefix ? 1 : 0) + (tempInfix ? 1 : 0) + (tempSuffix ? 1 : 0) + (tempRedup ? 1 : 0);
        // Weighted scoring by affix types (prefer prefix/redup more than suffix)
        const weights = { pref: 30, inf: 10, suff: 5, redup: 20 };
        let weightedScore = tempRoot.length;
        if (tempPrefix) weightedScore += weights.pref;
        if (tempInfix) weightedScore += weights.inf;
        if (tempSuffix) weightedScore += weights.suff;
        if (tempRedup) weightedScore += weights.redup;

        // Penalize tiny roots created by suffix stripping
        if (tempSuffix && tempRoot.length <= 3) {
          weightedScore -= 20;
        }

        const candidate = {
          root: tempRoot,
          prefix: tempPrefix,
          infix: tempInfix,
          suffix: tempSuffix,
          redup: tempRedup,
          score: weightedScore,
        };

        if (!bestCandidate || candidate.score > bestCandidate.score || (candidate.score === bestCandidate.score && candidate.root.length > bestCandidate.root.length)) {
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      root = bestCandidate.root;
      prefix = bestCandidate.prefix;
      infix = bestCandidate.infix;
      suffix = bestCandidate.suffix;
      reduplication = bestCandidate.redup;

      // Special-case heuristic for 'manga' contractions: if we detected 'mang' but
      // the remaining root looks like 'aon' -> convert to prefix 'manga' and root 'kaon'
      if (prefix === 'mang' && root && /^[aeiou]/.test(root) && root.length === 3 && root.endsWith('on')) {
        prefix = 'manga';
        root = 'k' + root;
        suffix = 'on';
      }
    }


    return {
      original,
      root,
      prefix,
      infix,
      suffix,
      reduplication,
    };
  }

  private stripPrefix(word: string): { root: string; prefix: string | null } {
    let firstPrefix: string | null = null;
    let current = word;

    // Iteratively remove stacked prefixes (e.g., 'pinaka' + 'ma') but only report the outermost
    while (true) {
      let longestPrefix: string | null = null;
      for (const pref of PREFIXES) {
        if (current.startsWith(pref)) {
          const remaining = current.slice(pref.length);
          if (remaining.length >= 3 && (!longestPrefix || pref.length > longestPrefix.length)) {
            longestPrefix = pref;
          }
        }
      }

      if (!longestPrefix) break;

      if (!firstPrefix) firstPrefix = longestPrefix;
      current = current.slice(longestPrefix.length);
    }

    return { root: current, prefix: firstPrefix };
  }

  private stripSuffix(word: string): { root: string; suffix: string | null } {
    let longestSuffix: string | null = null;
    
    for (const suff of SUFFIXES) {
      if (word.endsWith(suff)) {
        const remaining = word.slice(0, -suff.length);
        if (remaining.length >= 3 && (!longestSuffix || suff.length > longestSuffix.length)) {
          longestSuffix = suff;
        }
      }
    }
    
    if (longestSuffix) {
      return { root: word.slice(0, -longestSuffix.length), suffix: longestSuffix };
    }
    return { root: word, suffix: null };
  }

  private stripInfix(word: string): { root: string; infix: string | null } {
    // Infixes typically appear after the first consonant
    // e.g., s-in-ulat → sulat, g-um-ikan → gikan
    for (const inf of INFIXES) {
      const idx = word.indexOf(inf);
      // Infix should be after first char and not at the end
      // IMPORTANT: idx > 0 (not >= 0) to avoid matching at start
      // and idx + inf.length < word.length to ensure not at end
      if (idx > 0 && idx <= 2 && idx + inf.length < word.length) {
        const root = word.slice(0, idx) + word.slice(idx + inf.length);
        if (root.length >= 3) {
          return { root, infix: inf };
        }
      }
    }
    return { root: word, infix: null };
  }

  private removeDuplication(word: string): { root: string; reduced: boolean } {
    let longestMatch: string | null = null;

    for (let i = 1; i < word.length; i++) {
      const prefix = word.slice(0, i);
      const next = word.slice(i, i + prefix.length);
      if (prefix === next && prefix.length > 2) {
        longestMatch = prefix;
      }
    }

    if (longestMatch) {
      return { root: longestMatch, reduced: true };
    }

    return { root: word, reduced: false };
  }
}
