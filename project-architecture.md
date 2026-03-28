# Project Architecture — `@junsayke/cebuano-thesaurus`

> **Source of truth** for project structure, layer responsibilities, naming conventions, and contribution rules. All code changes must conform to this document.

---

## Overview

`cebuano-thesaurus` is a TypeScript library that exposes Cebuano language features — synonym lookup, rhyme detection, anagram generation, and morphological analysis — built on the **Phildict Wolff** (WCED) SQLite dictionary.

The project follows **Hexagonal Architecture** (Ports & Adapters). The goal is to keep the domain completely free of infrastructure concerns, making every layer independently testable and replaceable.

```
┌────────────────────────────────────────────────────────────────┐
│                        Consumer / Tests                        │
└───────────────────────────────┬────────────────────────────────┘
                                │ calls
┌───────────────────────────────▼────────────────────────────────┐
│                     Primary Adapters                           │
│              src/index.ts  (public API surface)                │
└───────────────────────────────┬────────────────────────────────┘
                                │ calls
┌───────────────────────────────▼────────────────────────────────┐
│                       Features (Use Cases)                     │
│   src/features/{anagrams,lookup,rhyme,synonyms}/               │
└──────────┬────────────────────────────────────────┬────────────┘
           │ uses (domain logic)                    │ calls via
┌──────────▼──────────┐               ┌─────────────▼────────────┐
│      Core           │               │     Output Ports          │
│  src/core/          │               │   src/ports/              │
│  - stemmer.ts       │               │  IWordRepository, etc.    │
│  - syllabifier.ts   │               └─────────────┬────────────┘
└─────────────────────┘                             │ implemented by
                                      ┌─────────────▼────────────┐
                                      │   Secondary Adapters      │
                                      │   src/adapters/           │
                                      │   (SQLite / Kysely)       │
                                      └─────────────┬────────────┘
                                                    │ reads
                                      ┌─────────────▼────────────┐
                                      │   Data                   │
                                      │   data/database/         │
                                      │   wolff.sqlite           │
                                      └──────────────────────────┘
```

---

## Directory Structure

```
cebuano-thesaurus/
├── data/
│   └── database/
│       ├── wolff.sqlite            # Phildict Wolff dictionary (not committed)
│       └── migrations/             # Kysely migration files
├── openspec/                       # OpenSpec change management
│   ├── changes/
│   ├── specs/
│   └── config.yaml
├── phildict/                       # Raw Phildict source data (submodule / local)
├── scripts/
│   ├── import-phildict-wolff-sql.ts
│   └── migrate.ts
├── src/
│   ├── adapters/                   # Secondary adapters (infrastructure)
│   ├── core/                       # Pure domain logic
│   │   ├── stemmer.ts
│   │   └── syllabifier.ts
│   ├── features/                   # Use-case layer (one folder per feature)
│   │   ├── anagrams/
│   │   ├── lookup/
│   │   ├── rhyme/
│   │   └── synonyms/
│   ├── ports/                      # Port interfaces (contracts)
│   ├── types/
│   │   └── database.ts             # Auto-generated Kysely types — do not edit
│   ├── utils/                      # Pure, stateless shared helpers
│   │   └── parseEntryXml.ts
│   └── index.ts                    # Public API surface (primary adapter / barrel)
├── tests/
│   └── index.test.ts
├── tsconfig.json
└── tsdown.config.ts
```

---

## Layer Definitions

### 1. Core (`src/core/`)

The innermost layer. Contains **pure Cebuano NLP algorithms** with zero dependencies on infrastructure, ports, or features. Classes and functions here must be side-effect-free and depend only on the TypeScript standard library.

**Responsibilities**
- Cebuano morphology: stemming, prefix/suffix/infix stripping, reduplication detection.
- Syllabification: CV-sequence analysis, syllable boundary rules, onset/nucleus/coda splitting.
- Any future pure linguistic algorithms (phonology, romanization, etc.).

**Rules**
- No `import` from `adapters/`, `features/`, `ports/`, or any external I/O package.
- Classes are exported as named exports, not default exports.
- Every public method must have a JSDoc comment.
- All logic must be covered by unit tests.

**Current modules**

| File | Class / Export | Description |
|---|---|---|
| `stemmer.ts` | `Stemmer`, `StemResult` | Krovetz-based Cebuano stemmer |
| `syllabifier.ts` | `Syllabifier`, `SyllableResult` | CV-pattern syllabification |

---

### 2. Ports (`src/ports/`)

Interfaces that define the **contracts** between the use-case layer and infrastructure. There are two port directions:

- **Input ports** (driving side) — interfaces that features expose to callers. Each feature may define an input port that `src/index.ts` references, keeping the public API decoupled from implementation.
- **Output ports** (driven side) — interfaces that features call and adapters implement. Examples: `IWordRepository`, `IEntryParser`.

**Rules**
- Ports are plain TypeScript `interface` or `type` declarations — no implementation code.
- Port files are named after their contract: `word-repository.port.ts`, `entry-parser.port.ts`.
- No imports from `adapters/` or any third-party package.
- Importing from `core/` and `types/` is allowed when the interface uses domain types.

**Naming convention**

```
src/ports/
├── word-repository.port.ts    # IWordRepository
├── entry-parser.port.ts       # IEntryParser
└── index.ts                   # re-exports all ports
```

---

### 3. Features (`src/features/`)

The **use-case / application layer**. Each sub-folder encapsulates one capability of the library. A feature orchestrates `core/` algorithms and calls `ports/` (output ports) to retrieve or persist data — it never touches adapters directly.

**Rules**
- One folder per feature. The folder name is the kebab-case feature name.
- Each feature folder must export a single entry point via its `index.ts`.
- Features may import from `core/`, `ports/`, `types/`, and `utils/`. Never from `adapters/`.
- Feature functions receive their dependencies via **constructor injection** or **function parameter injection** (pass the port interface, not the concrete adapter).
- Feature functions are pure from the caller's perspective: given the same inputs and the same repository responses, they return the same output.

**Folder convention**

```
src/features/lookup/
├── index.ts          # public re-export of the feature's input port & factory
├── lookup.ts         # implementation of the use case
└── lookup.test.ts    # co-located unit test (optional; mirrors tests/ for integration)
```

**Current features**

| Folder | Planned capability |
|---|---|
| `lookup/` | Look up a Cebuano word and return its dictionary entry |
| `synonyms/` | Find synonyms of a word from the Wolff database |
| `rhyme/` | Find words that rhyme based on last-syllable matching |
| `anagrams/` | Generate anagrams of a given word |

---

### 4. Adapters (`src/adapters/`)

Concrete implementations of the **output ports**. Adapters are the only layer allowed to import third-party infrastructure packages (`better-sqlite3`, `kysely`, `fast-xml-parser`).

**Rules**
- Every adapter implements exactly one port interface and is named accordingly: `SqliteWordRepository` implements `IWordRepository`.
- Adapters are never imported directly by features. They are wired up in `src/index.ts`.
- Database access goes through **Kysely** — raw SQL strings are forbidden inside adapters.
- Adapters handle infrastructure errors and translate them into domain errors defined in `core/` or `types/`.

**Naming convention**

```
src/adapters/
├── sqlite-word-repository.ts   # implements IWordRepository
├── xml-entry-parser.ts         # implements IEntryParser
└── index.ts                    # re-exports adapter factories
```

---

### 5. Types (`src/types/`)

Shared type definitions used across layers.

| File | Owner | Rule |
|---|---|---|
| `database.ts` | `kysely-codegen` | **Auto-generated. Never edit manually.** Regenerate with `pnpm db:generate`. |

Additional hand-written domain types (e.g., `DictionaryEntry`, `ThesaurusResult`) should live in `src/types/` and may be imported by any layer.

---

### 6. Utils (`src/utils/`)

**Pure, stateless helper functions** with no side effects and no knowledge of ports or adapters. A util function transforms data in and data out — nothing else.

**Rules**
- No class instances; prefer plain exported functions.
- No imports from `adapters/`, `features/`, or `ports/`.
- Every util must have a corresponding unit test.

**Current utilities**

| File | Export | Description |
|---|---|---|
| `parseEntryXml.ts` | `parseEntryXml` | Parses Phildict WCED XML entry strings into JS objects |

---

### 7. Public API (`src/index.ts`)

The **primary adapter** and the only file consumers of the library import. It wires concrete adapters to feature use cases and exposes a clean, versioned API surface.

**Rules**
- This is the **only** file that instantiates adapters and injects them into features.
- Only export what is intended to be public. Internal types, adapters, and port interfaces are not re-exported unless required by consumers.
- The database path is resolved relative to `import.meta.dirname` for portability.
- No business logic lives here — it delegates entirely to features.

---

## Data Layer

### Database

The Wolff SQLite database (`data/database/wolff.sqlite`) is the primary data source. It is not committed to the repository; it is generated locally via `pnpm db:import` (see scripts).

**Schema (Kysely-typed)**

| Table | Key columns | Purpose |
|---|---|---|
| `wced_entry` | `_id`, `entry` (XML), `head`, `page` | Full dictionary entry stored as raw XML |
| `wced_head` | `_id`, `entryid`, `head`, `normalized_head`, `pos`, `type` | Indexed headwords with part-of-speech |
| `wced_translation` | `_id`, `entryid`, `translation` | English translations per entry |
| `android_metadata` | `locale` | Legacy metadata from Phildict Android app |

### Migrations

Schema changes are managed by **Kysely Migrator**. Migration files live in `data/database/migrations/`.

- Filenames must follow the pattern `YYYY-MM-DD-<description>.ts`, e.g. `2025-01-15-add-normalized-head-index.ts`.
- Migrations are run with `pnpm db:migrate`.
- Never modify an existing migration file once it has been committed. Create a new migration instead.

### Scripts

| Script | Command | Description |
|---|---|---|
| `scripts/import-phildict-wolff-sql.ts` | _(run once manually)_ | Drops and re-creates `wolff.sqlite` from raw Phildict SQL dumps |
| `scripts/migrate.ts` | `pnpm db:migrate` | Runs Kysely migrations to latest |

Scripts are one-off tooling and must not be imported by library source code.

---

## Dependency Rules (Enforced Convention)

The table below defines which layers may import from which. Violating this breaks the hexagonal contract.

| From ↓ \ To → | `core` | `ports` | `features` | `adapters` | `types` | `utils` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `core` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `ports` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `features` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `adapters` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `types` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `utils` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `index.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Naming Conventions

### Files

| Context | Convention | Example |
|---|---|---|
| Core class | `kebab-case.ts` | `stemmer.ts`, `syllabifier.ts` |
| Port interface | `kebab-case.port.ts` | `word-repository.port.ts` |
| Adapter class | `kebab-case.ts` | `sqlite-word-repository.ts` |
| Feature use case | `kebab-case.ts` | `lookup.ts`, `find-synonyms.ts` |
| Utility function | `camelCase.ts` | `parseEntryXml.ts` |
| Test file | same name + `.test.ts` | `stemmer.test.ts` |

### TypeScript Identifiers

| Kind | Convention | Example |
|---|---|---|
| Interface | `PascalCase` prefixed with `I` | `IWordRepository` |
| Class | `PascalCase` | `Stemmer`, `SqliteWordRepository` |
| Type alias | `PascalCase` | `StemResult`, `DictionaryEntry` |
| Function | `camelCase` | `parseEntryXml`, `lookup` |
| Enum | `PascalCase` (values `UPPER_SNAKE`) | `PartOfSpeech.NOUN` |
| Constant | `UPPER_SNAKE_CASE` | `PREFIXES`, `SUFFIXES` |

### Exports

- Prefer **named exports** everywhere. Default exports are only acceptable for `tsdown.config.ts` and configuration files.
- Every `src/` sub-folder exposes a barrel `index.ts` that re-exports its public surface.

---

## Testing

| Type | Location | Runner | Scope |
|---|---|---|---|
| Unit | Co-located `*.test.ts` or `tests/` | Vitest | Core, utils, features (mocked ports) |
| Integration | `tests/` | Vitest | Adapter + real SQLite database |

**Rules**
- Feature tests must mock output ports — they must not touch the real database.
- Adapter (integration) tests may use a real SQLite in-memory database or a test fixture copy of `wolff.sqlite`.
- Core tests are pure input/output with no mocking.
- Tests are run with `pnpm test`.

---

## Build & Tooling

| Tool | Purpose | Config file |
|---|---|---|
| `tsdown` | Bundles library to `dist/index.mjs` + `.d.ts` | `tsdown.config.ts` |
| `typescript` | Type checking | `tsconfig.json` |
| `vitest` | Test runner | `package.json` (vitest field) |
| `bumpp` | Version bumping + git tagging | CLI |
| `kysely-codegen` | Generates `src/types/database.ts` from live schema | `pnpm db:generate` |

**TypeScript strictness:** `strict: true`, `noUnusedLocals: true`, `verbatimModuleSyntax: true`. These are non-negotiable.

---

## Adding a New Feature — Checklist

1. Create `src/features/<feature-name>/` with `<feature-name>.ts` and `index.ts`.
2. Define the feature's output port interface in `src/ports/<dependency>.port.ts` if new data access is required.
3. Implement the port in `src/adapters/<impl>.ts`.
4. Wire the adapter into the feature in `src/index.ts`.
5. Write unit tests for the use case with a mocked port.
6. Write an integration test in `tests/` if the adapter is non-trivial.
7. Export the feature's public API from `src/index.ts`.
8. Update this document if new layers or conventions are introduced.
