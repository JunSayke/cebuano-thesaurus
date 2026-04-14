# @junsayke/cebuano-thesaurus

A thesaurus for the Cebuano language, providing synonyms and related words. This TypeScript library exposes Cebuano language features built on the **Phildict Wolff (WCED)** SQLite dictionary.

## Features

The library encapsulates pure Cebuano NLP algorithms and database-driven features:

- **Lookup**: Look up a Cebuano word and return its dictionary entry.
- **Synonyms**: Find synonyms of a word from the Wolff database.
- **Rhyme Detection**: Find words that rhyme based on last-syllable matching.
- **Anagrams**: Generate anagrams of a given word.
- **Morphological Analysis**: Includes a Krovetz-based Cebuano stemmer (prefix/suffix/infix stripping, reduplication detection).
- **Syllabification**: CV-sequence analysis and syllable boundary rules.

## Architecture

This project strictly follows **Hexagonal Architecture (Ports & Adapters)** to keep the domain pure and infrastructure-agnostic.

- **Core (`src/core/`)**: Pure, side-effect-free Cebuano NLP algorithms (stemming, syllabification).
- **Ports (`src/ports/`)**: Interfaces defining contracts between use-cases and data infrastructure.
- **Features (`src/features/`)**: Use-case orchestration (Lookup, Synonyms, Rhyme, Anagrams).
- **Adapters (`src/adapters/`)**: Concrete implementations using `better-sqlite3`, `kysely`, and `fast-xml-parser`.

> **Note for Contributors:** Please read the [`project-architecture.md`](./project-architecture.md) carefully before contributing. It serves as the source of truth for layer responsibilities, naming conventions, and dependency rules.

## Installation

```bash
npm install @junsayke/cebuano-thesaurus
```

## Development & Setup

This library uses `pnpm` and `tsdown` for building, and `vitest` for testing.

### 1\. Database Setup

The primary data source is the Wolff SQLite database (`data/database/wolff.sqlite`), which is not committed to the repository. You must generate it locally:

1.  Run the import script to build the database from raw Phildict SQL dumps: `scripts/import-phildict-wolff-sql.ts`.
2.  Run database migrations via Kysely:
    ```bash
    pnpm run db:migrate
    ```

### 2\. Available Commands

- `pnpm run dev`: Start the development watcher.
- `pnpm run build`: Build the library into `dist/index.mjs` and TypeScript declarations.
- `pnpm run test`: Run unit and integration tests via Vitest.
- `pnpm run typecheck`: Run TypeScript type checking.
- `pnpm run db:generate`: Regenerate Kysely database types based on the current SQLite schema.
- `pnpm run release`: Bump the package version and generate a git tag using `bumpp`.

## License

[MIT](https://raw.githubusercontent.com/JunSayke/cebuano-thesaurus/refs/heads/main/LICENSE) © Antonio Ubaldo
