# Cebuano Thesaurus — Project Architecture

## 1. Design Philosophy

`cebuano-thesaurus` is a deterministic, offline-first TypeScript utility library. The architecture is guided by three principles:

1. **Ports & Adapters at every boundary** — feature logic never imports a concrete data source or a concrete algorithm implementation. It only talks to interfaces (ports). Concrete loaders and strategies are injected at the composition root.
2. **Feature slicing inside the core** — each capability (rhyme, synonyms, etc.) is a self-contained vertical slice with its own types, algorithm, and public function. Adding a new feature means adding a new folder, not modifying existing ones.
3. **Pure algorithmic core** — string processing, phonetic rules, and graph traversal are written as pure functions with no I/O. This makes them trivially unit-testable and portable to any runtime.

There are two distinct kinds of ports:

| Port family | Location | Answers the question |
|---|---|---|
| **Data ports** | `src/ports/data/` | *Where* does the data come from? (JSON, SQLite, API) |
| **Strategy ports** | `src/ports/strategies/` | *How* is the algorithm computed? (rules, ML, hybrid) |

---

## 2. Dependency Rule

Dependencies only flow inward. Nothing in an inner layer may import from an outer layer. `src/index.ts` is the single place where all outer layers are imported and wired together.

```
┌──────────────────────────────────────────────────────────────┐
│  src/index.ts  (composition root + public API)               │
│  — only file allowed to import adapters and strategies       │
├──────────────────────────────────────────────────────────────┤
│  src/features/*  (orchestration: calls ports, returns types) │
├──────────────────────────────────────────────────────────────┤
│  src/core/*  (pure algorithms, zero I/O, zero port calls)    │
├─────────────────────────────┬────────────────────────────────┤
│  src/ports/data/*           │  src/ports/strategies/*        │
│  (data source contracts)    │  (algorithm contracts)         │
└─────────────────────────────┴────────────────────────────────┘
         ↑ injected here, never imported by features
  src/data/adapters/*          src/strategies/*/*
  (JSON, SQLite, …)            (rule-based, ML, …)
```

---

## 3. Project Structure

```
cebuano-thesaurus/
│
├── data/                               # Lexical resource files (not shipped in dist)
│   ├── cebuano.db                      # SQLite database (primary offline source)
│   │                                   #   tables: words, word_translations, synonyms
│   │                                   #   columns: word, lemma, pos, definitions,
│   │                                   #            syllables, rhyming_part,
│   │                                   #            anagram_key, pronunciation,
│   │                                   #            phonetic_embedding (JSONB)
│   ├── lexicon.json                    # JSON fallback / dev fixture
│   ├── synonyms-graph.json             # Adjacency map { word → string[] }
│   ├── word-frequency.json             # Optional frequency ranks
│   └── README.md                       # Data schema and sourcing notes
│
├── src/
│   │
│   ├── index.ts                        # Composition root: instantiates all adapters
│   │                                   # and strategies, partially applies them to
│   │                                   # feature functions, and re-exports public API.
│   │
│   ├── types/                          # Shared domain types. No logic.
│   │   │                               # Imported by every other layer.
│   │   ├── lexicon.ts                  # WordEntry, PosToken, PosTag, MatchOptions
│   │   └── index.ts                    # Barrel re-export
│   │
│   ├── ports/
│   │   │
│   │   ├── data/                       # What data is needed and where it comes from.
│   │   │   │                           # Features import ONLY from here, never from adapters.
│   │   │   ├── IDictionaryPort.ts      # getByWord, listByRhymeKey,
│   │   │   │                           # listBySortedLetters, has
│   │   │   ├── ISynonymPort.ts         # getSynonyms(word): string[]
│   │   │   └── index.ts
│   │   │
│   │   └── strategies/                 # How an algorithm is computed.
│   │       │                           # Features import ONLY from here, never from
│   │       │                           # concrete strategy implementations.
│   │       ├── ISyllabifyStrategy.ts   # syllabify(word): string[]
│   │       ├── IRhymeStrategy.ts       # findRhymes(word, dict): string[]
│   │       ├── IPosStrategy.ts         # tag(text, dict): PosToken[]
│   │       └── index.ts
│   │
│   ├── data/
│   │   └── adapters/                   # Concrete implementations of data ports.
│   │       │                           # Only index.ts imports these.
│   │       ├── JsonDictionaryAdapter.ts    # Loads lexicon.json into memory maps
│   │       ├── JsonSynonymAdapter.ts       # Loads synonyms-graph.json
│   │       ├── SqliteDictionaryAdapter.ts  # Queries cebuano.db via better-sqlite3
│   │       └── SqliteSynonymAdapter.ts     # JOIN query across word_translations
│   │
│   ├── strategies/                     # Concrete implementations of strategy ports.
│   │   │                               # Only index.ts imports these.
│   │   ├── syllabify/
│   │   │   ├── RuleBasedSyllabifier.ts # Applies Cebuano CV/CVC/CCV/V phoneme rules
│   │   │   └── MlSyllabifier.ts        # Runs an ONNX sequence model
│   │   ├── rhyme/
│   │   │   ├── RuleBasedRhymeFinder.ts # Extracts rhyme key via phonetics.ts,
│   │   │   │                           # then queries dict port
│   │   │   └── MlRhymeFinder.ts        # Uses phonetic embeddings (JSONB column)
│   │   └── pos-tag/
│   │       ├── RuleBasedPosTagger.ts   # Affix rules + dictionary fallback
│   │       └── MlPosTagger.ts          # Token classification model (ONNX)
│   │
│   ├── core/                           # Pure functions. No I/O. No port calls.
│   │   │                               # Imported by features and strategy impls.
│   │   ├── normalizer.ts               # stripDiacritics, lowercase, trim
│   │   ├── tokenizer.ts                # splitOnWhitespaceAndPunctuation
│   │   ├── phonetics.ts                # syllabifyWord, rhymeKey, vowelMap
│   │   └── anagram.ts                  # sortLetters, buildAnagramKey
│   │
│   ├── features/                       # One folder per public capability.
│   │   │                               # Each slice owns its logic and export.
│   │   │                               # Allowed imports: types/, ports/*, core/ only.
│   │   │
│   │   ├── lookup/
│   │   │   ├── lookup.ts               # lookup(word, dict: IDictionaryPort)
│   │   │   └── index.ts
│   │   │
│   │   ├── rhyme/
│   │   │   ├── rhyme.ts                # rhyme(word, dict, strategy: IRhymeStrategy)
│   │   │   └── index.ts
│   │   │
│   │   ├── synonyms/
│   │   │   ├── synonyms.ts             # synonyms(word, syn: ISynonymPort)
│   │   │   └── index.ts
│   │   │
│   │   ├── anagrams/
│   │   │   ├── anagrams.ts             # anagrams(word, dict: IDictionaryPort)
│   │   │   └── index.ts
│   │   │
│   │   ├── syllabify/
│   │   │   ├── syllabify.ts            # syllabify(word, strategy: ISyllabifyStrategy)
│   │   │   └── index.ts
│   │   │
│   │   └── pos-tag/
│   │       ├── pos-tag.ts              # posTag(text, dict, strategy: IPosStrategy)
│   │       └── index.ts
│   │
│   └── utils/
│       └── set.ts                      # union, intersection helpers (pure)
│
├── tests/
│   ├── core/
│   │   ├── normalizer.test.ts
│   │   ├── phonetics.test.ts
│   │   └── anagram.test.ts
│   ├── features/
│   │   ├── lookup.test.ts              # Stub IDictionaryPort
│   │   ├── rhyme.test.ts               # Stub IDictionaryPort + IRhymeStrategy
│   │   ├── synonyms.test.ts            # Stub ISynonymPort
│   │   ├── anagrams.test.ts            # Stub IDictionaryPort
│   │   ├── syllabify.test.ts           # Stub ISyllabifyStrategy
│   │   └── pos-tag.test.ts             # Stub IDictionaryPort + IPosStrategy
│   ├── adapters/
│   │   ├── JsonDictionaryAdapter.test.ts
│   │   └── SqliteDictionaryAdapter.test.ts
│   ├── strategies/
│   │   ├── RuleBasedSyllabifier.test.ts
│   │   └── RuleBasedPosTagger.test.ts
│   └── fixtures/
│       ├── mock-dictionary.ts          # In-memory IDictionaryPort stub
│       └── mock-synonym.ts             # In-memory ISynonymPort stub
│
├── dist/                               # Built output (tsdown, gitignored)
├── package.json
├── tsconfig.json
├── tsdown.config.ts
└── README.md
```

---

## 4. Layer Responsibilities

### 4.1 `types/` — Domain contracts

Pure TypeScript interfaces and type aliases. No logic. Imported by every other layer.

```ts
// src/types/lexicon.ts
export interface WordEntry {
  word: string
  lemma: string
  pos: PosTag
  definitions: string[]
  syllables: string[]
  rhymingPart: string
  pronunciation: string
  variants?: string[]
}

export type PosTag = 'noun' | 'verb' | 'adj' | 'adv' | 'particle' | 'unknown'

export interface PosToken {
  token: string
  tag: PosTag
  lemma: string
  start: number
  end: number
}

export interface MatchOptions {
  limit?: number
  fuzzy?: boolean
}
```

---

### 4.2 `ports/data/` — Data source contracts

Thin interfaces describing *what* data capabilities are needed, never *how* they are satisfied.

```ts
// src/ports/data/IDictionaryPort.ts
import type { WordEntry } from '../../types/index.js'

export interface IDictionaryPort {
  getByWord(word: string): WordEntry | null
  listByRhymeKey(rhymeKey: string): string[]
  listBySortedLetters(sortedKey: string): string[]
  has(word: string): boolean
}
```

```ts
// src/ports/data/ISynonymPort.ts
export interface ISynonymPort {
  getSynonyms(word: string): string[]
}
```

---

### 4.3 `ports/strategies/` — Algorithm contracts

Thin interfaces describing *how* a computation should be performed, without fixing a specific implementation. Features that have swappable algorithms accept one of these ports instead of calling `core/` directly.

```ts
// src/ports/strategies/ISyllabifyStrategy.ts
export interface ISyllabifyStrategy {
  syllabify(word: string): string[]
}
```

```ts
// src/ports/strategies/IRhymeStrategy.ts
import type { IDictionaryPort } from '../data/IDictionaryPort.js'

// Some strategies need data access (ML embedding lookup);
// others are fully stateless (rule-based). The dict port is
// passed in so strategies can stay decoupled from adapters.
export interface IRhymeStrategy {
  findRhymes(word: string, dict: IDictionaryPort): string[]
}
```

```ts
// src/ports/strategies/IPosStrategy.ts
import type { PosToken } from '../../types/index.js'
import type { IDictionaryPort } from '../data/IDictionaryPort.js'

export interface IPosStrategy {
  tag(text: string, dict: IDictionaryPort): PosToken[]
}
```

---

### 4.4 `data/adapters/` — Concrete data loaders

Implement data ports. Instantiated once at startup. Only `src/index.ts` imports these.

#### JSON adapter (dev / offline fallback)

```ts
// src/data/adapters/JsonDictionaryAdapter.ts
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import type { WordEntry } from '../../types/index.js'
import rawData from '../../../data/lexicon.json' assert { type: 'json' }

export class JsonDictionaryAdapter implements IDictionaryPort {
  private readonly wordMap = new Map<string, WordEntry>()
  private readonly rhymeBuckets = new Map<string, string[]>()
  private readonly anagramBuckets = new Map<string, string[]>()

  constructor() {
    for (const entry of rawData as WordEntry[]) {
      this.wordMap.set(entry.word, entry)

      const rk = entry.rhymingPart
      if (!this.rhymeBuckets.has(rk)) this.rhymeBuckets.set(rk, [])
      this.rhymeBuckets.get(rk)!.push(entry.word)

      const ak = [...entry.word].sort().join('')
      if (!this.anagramBuckets.has(ak)) this.anagramBuckets.set(ak, [])
      this.anagramBuckets.get(ak)!.push(entry.word)
    }
  }

  getByWord(word: string) { return this.wordMap.get(word) ?? null }
  listByRhymeKey(key: string) { return this.rhymeBuckets.get(key) ?? [] }
  listBySortedLetters(key: string) { return this.anagramBuckets.get(key) ?? [] }
  has(word: string) { return this.wordMap.has(word) }
}
```

#### SQLite adapter (production offline-first)

Switching to SQLite requires only a new adapter class. No feature file is touched.

```ts
// src/data/adapters/SqliteDictionaryAdapter.ts
import Database from 'better-sqlite3'
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import type { WordEntry } from '../../types/index.js'

export class SqliteDictionaryAdapter implements IDictionaryPort {
  private readonly db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
  }

  getByWord(word: string): WordEntry | null {
    return this.db
      .prepare('SELECT * FROM words WHERE word = ?')
      .get(word) as WordEntry ?? null
  }

  listByRhymeKey(key: string): string[] {
    return this.db
      .prepare('SELECT word FROM words WHERE rhyming_part = ?')
      .all(key)
      .map((r: any) => r.word)
  }

  listBySortedLetters(key: string): string[] {
    return this.db
      .prepare('SELECT word FROM words WHERE anagram_key = ?')
      .all(key)
      .map((r: any) => r.word)
  }

  has(word: string): boolean {
    return !!this.db
      .prepare('SELECT 1 FROM words WHERE word = ? LIMIT 1')
      .get(word)
  }
}
```

#### SQLite synonym adapter (relational join)

Returns all Cebuano words that share at least one English translation with the query word — no graph structure needed.

```ts
// src/data/adapters/SqliteSynonymAdapter.ts
import Database from 'better-sqlite3'
import type { ISynonymPort } from '../../ports/data/ISynonymPort.js'

export class SqliteSynonymAdapter implements ISynonymPort {
  private readonly db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
  }

  getSynonyms(word: string): string[] {
    return this.db.prepare(`
      SELECT DISTINCT w2.word
      FROM word_translations wt1
      JOIN word_translations wt2 ON wt1.translation_id = wt2.translation_id
      JOIN words w2             ON wt2.word_id = w2.id
      WHERE wt1.word = ? AND w2.word != ?
    `).all(word, word).map((r: any) => r.word)
  }
}
```

---

### 4.5 `strategies/` — Concrete algorithm implementations

Implement strategy ports. Only `src/index.ts` imports these. Each strategy may use `core/` pure functions but never imports adapters directly.

#### Rule-based syllabifier

```ts
// src/strategies/syllabify/RuleBasedSyllabifier.ts
import type { ISyllabifyStrategy } from '../../ports/strategies/ISyllabifyStrategy.js'
import { syllabifyWord } from '../../core/phonetics.js'

export class RuleBasedSyllabifier implements ISyllabifyStrategy {
  syllabify(word: string): string[] {
    return syllabifyWord(word)   // delegates to pure core function
  }
}
```

#### ML syllabifier (ONNX)

```ts
// src/strategies/syllabify/MlSyllabifier.ts
import type { ISyllabifyStrategy } from '../../ports/strategies/ISyllabifyStrategy.js'

export class MlSyllabifier implements ISyllabifyStrategy {
  private readonly model: OnnxSession

  constructor(modelPath: string) {
    this.model = loadOnnxModel(modelPath)
  }

  syllabify(word: string): string[] {
    return this.model.run(word)
  }
}
```

#### Rule-based rhyme finder

```ts
// src/strategies/rhyme/RuleBasedRhymeFinder.ts
import type { IRhymeStrategy } from '../../ports/strategies/IRhymeStrategy.js'
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import { rhymeKey } from '../../core/phonetics.js'
import { normalize } from '../../core/normalizer.js'

export class RuleBasedRhymeFinder implements IRhymeStrategy {
  findRhymes(word: string, dict: IDictionaryPort): string[] {
    const normalized = normalize(word)
    const key = rhymeKey(normalized)
    return dict.listByRhymeKey(key).filter(w => w !== normalized)
  }
}
```

#### ML rhyme finder (phonetic embeddings stored in DB)

Requires a `phonetic_embedding` JSONB column in the SQLite `words` table. The adapter would expose an extended method, or a dedicated `IPhoneticPort` can be created when this path is pursued.

```ts
// src/strategies/rhyme/MlRhymeFinder.ts
import type { IRhymeStrategy } from '../../ports/strategies/IRhymeStrategy.js'
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'

export class MlRhymeFinder implements IRhymeStrategy {
  private readonly model: EmbeddingModel

  constructor(modelPath: string) {
    this.model = loadEmbeddingModel(modelPath)
  }

  findRhymes(word: string, dict: IDictionaryPort): string[] {
    const embedding = this.model.embed(word)
    // Queries the phonetic_embedding JSONB column via an extended port method
    return (dict as any).listByPhoneticSimilarity(embedding)
  }
}
```

#### Rule-based POS tagger

```ts
// src/strategies/pos-tag/RuleBasedPosTagger.ts
import type { IPosStrategy } from '../../ports/strategies/IPosStrategy.js'
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import type { PosToken, PosTag } from '../../types/index.js'
import { tokenize } from '../../core/tokenizer.js'
import { normalize } from '../../core/normalizer.js'

export class RuleBasedPosTagger implements IPosStrategy {
  tag(text: string, dict: IDictionaryPort): PosToken[] {
    return tokenize(text).map(({ token, start, end }) => {
      const entry = dict.getByWord(normalize(token))
      const tag = entry?.pos ?? this.applyAffixRules(token)
      return { token, tag, lemma: entry?.lemma ?? token, start, end }
    })
  }

  private applyAffixRules(token: string): PosTag {
    if (token.startsWith('nag') || token.startsWith('mo')) return 'verb'
    if (token.endsWith('on')    || token.endsWith('an'))   return 'verb'
    if (token.startsWith('ka')  && token.endsWith('an'))   return 'noun'
    return 'unknown'
  }
}
```

#### ML POS tagger (ONNX token classifier)

```ts
// src/strategies/pos-tag/MlPosTagger.ts
import type { IPosStrategy } from '../../ports/strategies/IPosStrategy.js'
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import type { PosToken } from '../../types/index.js'
import { tokenize } from '../../core/tokenizer.js'

export class MlPosTagger implements IPosStrategy {
  private readonly model: OnnxSession

  constructor(modelPath: string) {
    this.model = loadOnnxModel(modelPath)
  }

  tag(text: string, _dict: IDictionaryPort): PosToken[] {
    const tokens = tokenize(text)
    const tags = this.model.classify(tokens.map(t => t.token))
    return tokens.map((t, i) => ({ ...t, tag: tags[i], lemma: t.token }))
  }
}
```

---

### 4.6 `core/` — Pure algorithms

No dependencies on ports or adapters. Used freely by features and strategy implementations.

```ts
// src/core/phonetics.ts
export function syllabifyWord(word: string): string[] {
  // Applies Cebuano CV / CVC / CCV / V syllable rules
  const syllables: string[] = []
  // ... rule implementation
  return syllables
}

export function rhymeKey(word: string): string {
  const syllables = syllabifyWord(word)
  return syllables.at(-1) ?? word
}
```

```ts
// src/core/normalizer.ts
export function normalize(input: string): string {
  return input.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}
```

---

### 4.7 `features/` — Orchestration slices

Each feature function accepts its required port(s) as parameters. It has no knowledge of which adapter or strategy satisfies those ports.

```ts
// src/features/rhyme/rhyme.ts
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import type { IRhymeStrategy }  from '../../ports/strategies/IRhymeStrategy.js'

export function rhyme(
  word: string,
  dict: IDictionaryPort,
  strategy: IRhymeStrategy
): string[] {
  return strategy.findRhymes(word, dict)
}
```

```ts
// src/features/syllabify/syllabify.ts
import type { ISyllabifyStrategy } from '../../ports/strategies/ISyllabifyStrategy.js'
import { normalize } from '../../core/normalizer.js'

export function syllabify(word: string, strategy: ISyllabifyStrategy): string[] {
  return strategy.syllabify(normalize(word))
}
```

```ts
// src/features/pos-tag/pos-tag.ts
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import type { IPosStrategy }    from '../../ports/strategies/IPosStrategy.js'
import type { PosToken }        from '../../types/index.js'

export function posTag(
  text: string,
  dict: IDictionaryPort,
  strategy: IPosStrategy
): PosToken[] {
  return strategy.tag(text, dict)
}
```

```ts
// src/features/anagrams/anagrams.ts
// No strategy port needed — sorting letters is a stable one-liner.
// Only the data source is variable.
import type { IDictionaryPort } from '../../ports/data/IDictionaryPort.js'
import { normalize } from '../../core/normalizer.js'

export function anagrams(word: string, dict: IDictionaryPort): string[] {
  const normalized = normalize(word)
  const key = [...normalized].sort().join('')
  return dict.listBySortedLetters(key).filter(w => w !== normalized)
}
```

---

### 4.8 `src/index.ts` — Composition root & public API

The **only** file that imports from `data/adapters/` and `strategies/`. It instantiates all concrete objects, injects them into feature functions via partial application, and exports a clean zero-dependency API surface.

```ts
// src/index.ts

// ── Data adapters ──────────────────────────────────────────────────────────
// Swap SqliteDictionaryAdapter ↔ JsonDictionaryAdapter with no other changes.
import { SqliteDictionaryAdapter } from './data/adapters/SqliteDictionaryAdapter.js'
import { SqliteSynonymAdapter }    from './data/adapters/SqliteSynonymAdapter.js'

// ── Strategy implementations ───────────────────────────────────────────────
// Swap RuleBased* ↔ Ml* with no other changes.
import { RuleBasedSyllabifier }  from './strategies/syllabify/RuleBasedSyllabifier.js'
import { RuleBasedRhymeFinder }  from './strategies/rhyme/RuleBasedRhymeFinder.js'
import { RuleBasedPosTagger }    from './strategies/pos-tag/RuleBasedPosTagger.js'

// ── Feature functions ──────────────────────────────────────────────────────
import { lookup    as _lookup    } from './features/lookup/index.js'
import { rhyme     as _rhyme     } from './features/rhyme/index.js'
import { synonyms  as _synonyms  } from './features/synonyms/index.js'
import { anagrams  as _anagrams  } from './features/anagrams/index.js'
import { syllabify as _syllabify } from './features/syllabify/index.js'
import { posTag    as _posTag    } from './features/pos-tag/index.js'

// ── Wire everything (instantiated once) ───────────────────────────────────
const dict = new SqliteDictionaryAdapter('./data/cebuano.db')
const syn  = new SqliteSynonymAdapter('./data/cebuano.db')

const syllabifier = new RuleBasedSyllabifier()
const rhymeFinder = new RuleBasedRhymeFinder()
const posTagger   = new RuleBasedPosTagger()

// ── Public API (dependency-free from caller's perspective) ─────────────────
export const lookup    = (word: string) => _lookup(word, dict)
export const rhyme     = (word: string) => _rhyme(word, dict, rhymeFinder)
export const synonyms  = (word: string) => _synonyms(word, syn)
export const anagrams  = (word: string) => _anagrams(word, dict)
export const syllabify = (word: string) => _syllabify(word, syllabifier)
export const posTag    = (text: string) => _posTag(text, dict, posTagger)

// ── Re-export types for consumers ─────────────────────────────────────────
export type { WordEntry, PosToken, MatchOptions } from './types/index.js'
```

---

## 5. Flexibility Matrix

The table below shows how each feature handles swappable data sources and swappable algorithms. A ✅ means the variation is already handled by the existing port boundary — no feature code changes required.

| Feature | Data source variation | Algorithm variation |
|---|---|---|
| **Lookup** | `IDictionaryPort` → JSON or SQLite adapter ✅ | N/A — pure retrieval |
| **Rhyme** | `IDictionaryPort` → phonetic JSONB column in SQLite ✅ | `IRhymeStrategy` → rules or ML ✅ |
| **Synonyms** | `ISynonymPort` → graph JSON or translation JOIN query ✅ | N/A — graph traversal is a stable algorithm |
| **Anagrams** | `IDictionaryPort.listBySortedLetters` → precomputed column or runtime query ✅ | N/A — key sort is a pure one-liner |
| **Syllabify** | N/A — stateless | `ISyllabifyStrategy` → rules or ML ✅ |
| **POS Tag** | `IDictionaryPort` → dictionary-based fallback ✅ | `IPosStrategy` → rules or ML ✅ |

---

## 6. Testing Strategy

The port-injection pattern makes every feature independently testable with a plain stub object — no real database or model required.

### Fixture stubs

```ts
// tests/fixtures/mock-dictionary.ts
import type { IDictionaryPort } from '../../src/ports/data/IDictionaryPort.js'
import type { WordEntry } from '../../src/types/index.js'

const entries: WordEntry[] = [
  {
    word: 'bato', lemma: 'bato', pos: 'noun',
    definitions: ['stone', 'rock'], syllables: ['ba', 'to'],
    rhymingPart: 'ato', pronunciation: 'ba.to', variants: [],
  },
  {
    word: 'gato', lemma: 'gato', pos: 'noun',
    definitions: ['cat'], syllables: ['ga', 'to'],
    rhymingPart: 'ato', pronunciation: 'ga.to', variants: [],
  },
]

export const mockDict: IDictionaryPort = {
  getByWord: (w) => entries.find(e => e.word === w) ?? null,
  listByRhymeKey: (k) => entries.filter(e => e.rhymingPart === k).map(e => e.word),
  listBySortedLetters: (k) =>
    entries.filter(e => [...e.word].sort().join('') === k).map(e => e.word),
  has: (w) => entries.some(e => e.word === w),
}
```

### Feature tests (no real data, no real strategy)

```ts
// tests/features/rhyme.test.ts
import { rhyme } from '../../src/features/rhyme/rhyme.js'
import { mockDict } from '../fixtures/mock-dictionary.js'
import type { IRhymeStrategy } from '../../src/ports/strategies/IRhymeStrategy.js'

const mockRhymeStrategy: IRhymeStrategy = {
  findRhymes: (word, dict) =>
    dict.listByRhymeKey('ato').filter(w => w !== word),
}

test('returns words sharing the last syllable', () => {
  expect(rhyme('bato', mockDict, mockRhymeStrategy)).toContain('gato')
})

test('excludes the query word itself', () => {
  expect(rhyme('bato', mockDict, mockRhymeStrategy)).not.toContain('bato')
})
```

```ts
// tests/features/syllabify.test.ts
import { syllabify } from '../../src/features/syllabify/syllabify.js'
import type { ISyllabifyStrategy } from '../../src/ports/strategies/ISyllabifyStrategy.js'

const mockStrategy: ISyllabifyStrategy = {
  syllabify: (w) => w === 'kalibutan' ? ['ka', 'li', 'bu', 'tan'] : [w],
}

test('syllabifies a known word', () => {
  expect(syllabify('kalibutan', mockStrategy)).toEqual(['ka', 'li', 'bu', 'tan'])
})
```

### Strategy tests (pure algorithm, no ports needed)

```ts
// tests/strategies/RuleBasedSyllabifier.test.ts
import { RuleBasedSyllabifier } from '../../src/strategies/syllabify/RuleBasedSyllabifier.js'

const s = new RuleBasedSyllabifier()

test('handles CV pattern',  () => expect(s.syllabify('bata')).toEqual(['ba', 'ta']))
test('handles CVC pattern', () => expect(s.syllabify('balay')).toEqual(['ba', 'lay']))
```

### Test layer summary

| Layer | What to test | Needs real data? |
|---|---|---|
| `core/` | Pure functions | No |
| `features/` | Orchestration + port wiring | No — use stubs |
| `strategies/` | Algorithm correctness | No — stateless |
| `data/adapters/` | Index building, SQL queries | Yes — fixture DB / JSON |
| `src/index.ts` | Integration smoke test | Yes — full stack |

---

## 7. Extensibility Recipes

### Adding a new feature (e.g. `antonyms`)

1. Add `IAntonymPort` to `src/ports/data/` if new data access is needed.
2. Create `src/data/adapters/SqliteAntonymAdapter.ts` implementing it.
3. Create `src/features/antonyms/antonyms.ts` — accepts `IAntonymPort`.
4. Wire in `src/index.ts`:
   ```ts
   const ant = new SqliteAntonymAdapter('./data/cebuano.db')
   export const antonyms = (word: string) => _antonyms(word, ant)
   ```
5. Add `tests/features/antonyms.test.ts` with a stub.

No existing files are modified except the three import/wire lines in `index.ts`.

### Swapping to ML for syllabification

1. Create `src/strategies/syllabify/MlSyllabifier.ts` implementing `ISyllabifyStrategy`.
2. Change one line in `index.ts`:
   ```ts
   // before
   const syllabifier = new RuleBasedSyllabifier()
   // after
   const syllabifier = new MlSyllabifier('./models/syllabify.onnx')
   ```

No feature code, no port code, no test fixtures change.

### Swapping the data source (e.g. JSON → SQLite)

Create `SqliteDictionaryAdapter.ts` implementing `IDictionaryPort`. Change one line in `index.ts`:

```ts
// before
const dict = new JsonDictionaryAdapter()
// after
const dict = new SqliteDictionaryAdapter('./data/cebuano.db')
```

All six features are untouched.

### Adding an async data source (e.g. remote API)

Extend the relevant port methods to return `Promise<...>`, update the adapter to `async/await`, and update the feature function to `await` the port call. The change is contained to that feature's files, its port, and the new adapter.

---

## 8. Public API Summary

```ts
lookup(word: string): WordEntry | null
rhyme(word: string): string[]
synonyms(word: string): string[]
anagrams(word: string): string[]
syllabify(word: string): string[]
posTag(text: string): PosToken[]
```

All functions are synchronous and pure from the caller's perspective. They never throw on missing data — they return `null` or empty arrays. Errors are only thrown on programmer mistakes (e.g. passing `undefined`).

---

## 9. Build Notes

- `tsdown` bundles `src/` into `dist/index.mjs` and `dist/index.d.mts`.
- `data/lexicon.json` is imported statically via `assert { type: 'json' }` and inlined by tsdown — no extra assets for consumers when using the JSON adapter.
- `data/cebuano.db` is referenced by path and must be distributed alongside the package. Add it to `"files"` in `package.json`.
- `tsconfig.json` requires `resolveJsonModule: true` for JSON imports.
- Recommended `package.json` files field:
  ```json
  "files": ["dist", "data/cebuano.db"]
  ```
