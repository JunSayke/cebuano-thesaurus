Project Path: cebuano-thesaurus

Source Tree:

```txt
cebuano-thesaurus
├── README.md
├── dist
│   ├── index.d.mts
│   └── index.mjs
├── node_modules
├── package.json
├── project-architecture.md
├── src
│   └── index.ts
├── tests
│   └── index.test.ts
├── tsconfig.json
└── tsdown.config.ts

```

`README.md`:

```md
# tsdown-starter

A starter for creating a TypeScript package.

## Development

- Install dependencies:

```bash
npm install
```

- Run the unit tests:

```bash
npm run test
```

- Build the library:

```bash
npm run build
```

```

`dist/index.d.mts`:

```mts
//#region src/index.d.ts
declare function fn(): string;
//#endregion
export { fn };
```

`dist/index.mjs`:

```mjs
//#region src/index.ts
function fn() {
	return "Hello, tsdown!";
}
//#endregion
export { fn };

```

`package.json`:

```json
{
  "name": "tsdown-starter",
  "type": "module",
  "version": "0.0.0",
  "description": "A starter for creating a TypeScript package.",
  "author": "Author Name <author.name@mail.com>",
  "license": "MIT",
  "homepage": "https://github.com/author/library#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/author/library.git"
  },
  "bugs": {
    "url": "https://github.com/author/library/issues"
  },
  "exports": {
    ".": "./dist/index.mjs",
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "release": "bumpp",
    "prepublishOnly": "pnpm run build"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@typescript/native-preview": "7.0.0-dev.20260316.1",
    "bumpp": "^11.0.1",
    "tsdown": "^0.21.3",
    "typescript": "^5.9.3",
    "vitest": "^4.1.0"
  }
}

```

`project-architecture.md`:

```md
# Cebuano Thesaurus Library - Project Architecture

## 1. Overview

`cebuano-thesaurus` is a TypeScript library for Cebuano language word intelligence: word lookup, rhyme finding, synonyms, anagrams, syllabification, POS tagging, and related text operations.

Vision:
- Provide a performant, deterministic and offline-friendly Cebuano lexical toolkit.
- Support cross-platform Node and browser.
- Be extensible with external dictionaries/AI models later.

## 2. High-level architecture

- `src/` contains feature modules and a single export entrypoint.
- `data/` (recommended) contains lexical resources and normalization maps.
- `tests/` has broad unit tests for each task.
- `package.json` exports the public API and build scripts.

### 2.1 Logical layers
1. API layer (public exports)
2. Core analysis / algorithm layer
3. Data layer (dictionary + phonology)
4. Utilities (normalization, tokenization, POS heuristics)

## 3. Core capabilities

1. Word lookup - canonical Cebuano entries (definitions, root forms, pronunciations)
2. Rhyme finder - `rhymingWords(term)`
3. Synonym finder - `synonyms(term)` and `similar(term, options)`
4. Anagram finder - `anagrams(term, options)`
5. Syllabifier - `syllabify(word)`
6. POS tagger - `tag(word | sentence)`
7. Support for add-on tasks: antonyms, word family, lemmatize, frequency ranking.

## 4. Public API design

### 4.1 Entrypoints
- `src/index.ts`
  - `lookup(word: string): WordEntry | null`
  - `rhyme(word: string): string[]`
  - `synonyms(word: string): string[]`
  - `anagrams(word: string): string[]`
  - `syllabify(word: string): string[]`
  - `posTag(text: string): PosToken[]`

### 4.2 Types
- `WordEntry` (lemma, variants, definition[], pos, tags, pronunciation)
- `PosToken` (`{ token, tag, lemma, start, end }`)
- `MatchOptions` for fuzzy/prefix and limit

## 5. Module breakdown

- `src/dictionary.ts`
  - load/lookup of entries
  - stems, inflections

- `src/phonetics.ts`
  - syllable split rules
  - rhyme key generation
  - vowel mapping for Cebuano phonology

- `src/synonyms.ts`
  - synonym graph traversal and adjacency mapping

- `src/anagrams.ts`
  - sorted key map, maybe precomputed buckets for performance

- `src/pos.ts`
  - rule-based tagger (`noun`, `verb`, `adj`, `adv`, etc.)
  - fallback dictionary-based tags

- `src/utils.ts`
  - normalization helpers, diacritics, lowercasing, union set.

- `src/index.ts`
  - re-export functions and share resources.

## 6. Data model and data sources

### 6.1 Reference data
- Cebuano lexicon dataset (JSON/SQLite) with fields:
  - `word`, `lemma`, `pos`, `definitions`, `pronunciation`, `syllables`, `rhymingPart`, `synonyms`.
- Optionally `word-frequency.json`.

### 6.2 In-memory indexes
- `wordsByLemma` map
- `rhymeBuckets` map keyed by syllable ending
- `synonymsWiki` graph map
- `anagramBuckets` map keyed by sorted letters

## 7. Algorithms

### 7.1 Syllabifier
1. Normalize input letters
2. Apply Cebuano syllable rules (CV, CVC, CCV, V).
3. Return array of syllables + stress pattern.

### 7.2 Rhyme finder
1. Syllabify input
2. Extract last stressed syllable and/or coda
3. Lookup in `rhymeBuckets`
4. Filter out same word

### 7.3 Synonym finder
1. Normalize form
2. Look up direct synonyms table
3. Optional deep traversal for networked synonyms

### 7.4 Anagram finder
1. Normalize and sort letters
2. Look up keys in precomputed bucket
3. Avoid original word

### 7.5 POS tagger
1. Pre-tokenize on whitespace/punctuation
2. Check dictionary for each token
3. Rule fallback (affixes, endings)
4. Return token-tag pairs

## 8. Quality and safety

- Always normalize and strip spacing/diacritics for comparisons.
- Handle non-word input safely (empty string => default result).
- Provide explicit types and `unknown` handling.
- Possible safe fallback for browser with no file-system data if required.

## 9. Testing strategy

- Unit tests per function under `tests/`:
  - Lookup returns expected structure
  - Rhyme includes known rhymes, excludes non-rhymes
  - Synonyms match dictionaries
  - Anagram expects known pairs and no same word
  - Syllabify validates word boundaries
  - POS tagger checks common phrase templates

- Data-driven tests with representative Cebuano samples.
- Snapshot tests for output shape.

## 10. Build and release

- Use TS library mode in `tsconfig` remain stable.
- `pnpm build` compiles to `dist` as set by tsdown starter.
- `pnpm test` runs `vitest`.
- Publish to npm with `npm publish` after version bump.

## 11. Extensibility

- Plugin interface:
  - `registerDictionary(source: DictionarySource)`
  - `registerRhymeStrategy(name, fn)`

- Async-ready API for large datasets:
  - `await lookupAsync(...)`, `loadDictionaryAsync(...)`

- CLI wrapper in `bin/` for quick command-line searches.

## 12. Example usage

```ts
import { lookup, rhyme, synonyms, anagrams, syllabify, posTag } from 'cebuano-thesaurus'

const entry = lookup('bayani')
const similarRhyme = rhyme('kanta')
const syns = synonyms('maayo')
const anag = anagrams('bato')
const syllables = syllabify('kalibutan')
const tagged = posTag('Ang bata nagdula sa plaza.')
```

## 13. Roadmap items

- Add morphological parser/breaker
- Add phrase and idiom lookup
- Add sorted lexicographical search by prefix
- Add cloud-based telemetry for usage patterns (opt-in)
- Add support for other Visayan languages

```

`src/index.ts`:

```ts
export function fn() {
  return 'Hello, tsdown!'
}

```

`tests/index.test.ts`:

```ts
import { expect, test } from 'vitest'
import { fn } from '../src'

test('fn', () => {
  expect(fn()).toBe('Hello, tsdown!')
})

```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["es2023"],
    "moduleDetection": "force",
    "module": "preserve",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "types": ["node"],
    "strict": true,
    "noUnusedLocals": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}

```

`tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    tsgo: true,
  },
  exports: true,
  // ...config options
})

```