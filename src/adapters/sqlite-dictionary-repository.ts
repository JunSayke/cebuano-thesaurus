import type { Kysely } from 'kysely';
import type { DB } from '../types/database';
import type { IDictionaryRepository } from '../ports/dictionary-repository.port';
import { parseEntryXml } from '../utils/parseEntryXml';
import type { EntrySummary, ThesaurusEntry } from '../types/dictionary';

export class SqliteDictionaryRepository implements IDictionaryRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async fuzzySearch(query: string, limit = 20): Promise<EntrySummary[]> {
    const normalizedQuery = query.toLowerCase().trim();

    const rows = await this.db
      .selectFrom('wced_head')
      .select(['entryid', 'head', 'normalized_head', 'pos'])
      .where('type', '=', 'm')
      // Find any matching entry (main or sub) and use its entryid
      .where('entryid', 'in', (eb) => eb
        .selectFrom('wced_head')
        .select('entryid')
        .where('normalized_head', 'like', `%${normalizedQuery}%`)
      )
      .orderBy((eb) => eb.case()
        // Order based on how closely the MAIN word matches the query
        .when('normalized_head', '=', normalizedQuery).then(1)
        .when('normalized_head', 'like', `${normalizedQuery}%`).then(2)
        .else(3)
      .end())
      .limit(limit)
      .execute();
      
    return rows
      .map(r => ({
        entryId: r.entryid as number,
        headword: r.head as string,
        normalizedHead: r.normalized_head as string,
        pos: r.pos ?? undefined,
      }));
  }

  async findEntry(word: string): Promise<ThesaurusEntry | null> {
    const row = await this.db
      .selectFrom('wced_head')
      .innerJoin('wced_entry', 'wced_head.entryid', 'wced_entry._id')
      .select('wced_entry.entry')
      .where('wced_head.normalized_head', '=', word.toLowerCase())
      .executeTakeFirst();

    return row?.entry ? parseEntryXml(row.entry) : null;
  }
}
