import { Kysely, sql } from 'kysely';
import type { DB } from '../types/database';
import type { IDictionaryRepository } from '../ports/dictionary-repository.port';
import { parseEntryXml } from '../utils/parseEntryXml';
import type { EntrySummary, ThesaurusEntry } from '../types/dictionary';
import type { RhymeSearchParams, RhymeCandidate } from '../types/rhyme';

export class SqliteDictionaryRepository implements IDictionaryRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async fuzzySearch(query: string, limit = 20): Promise<EntrySummary[]> {
    const normalizedQuery = query.toLowerCase().trim();

    const rows = await this.db
      .selectFrom('wced_head')
      .select(['entryid', 'head', 'normalized_head', 'pos', sql<string>`(SELECT json_group_array(translation) FROM wced_translation WHERE entryid = wced_head.entryid)`.as('translations')])
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
        translations: JSON.parse(r.translations || '[]').filter(Boolean)
      }));
  }

  async findEntry(query: string | number): Promise<ThesaurusEntry | null> {
    let dbQuery = this.db
      .selectFrom('wced_head')
      .innerJoin('wced_entry', 'wced_head.entryid', 'wced_entry._id')
      .select('wced_entry.entry');

    if (typeof query === 'number') {
      dbQuery = dbQuery.where('wced_head.entryid', '=', query);
    } else {
      dbQuery = dbQuery.where('wced_head.normalized_head', '=', query.toLowerCase());
    }

    const row = await dbQuery.executeTakeFirst();

    return row?.entry ? parseEntryXml(row.entry) : null;
  }

  async findTranslations(query: string | number): Promise<string[]> {
    let dbQuery = this.db
      .selectFrom('wced_head')
      .select('entryid');

    if (typeof query === 'number') {
      dbQuery = dbQuery.where('entryid', '=', query);
    } else {
      dbQuery = dbQuery.where('normalized_head', '=', query.toLowerCase());
    }

    const row = await dbQuery.executeTakeFirst();
    if (!row?.entryid) {
      return [];
    }

    const translations = await this.db
      .selectFrom('wced_translation')
      .select('translation')
      .where('entryid', '=', row.entryid)
      .execute();

    return translations
      .map(t => t.translation)
      .filter((t): t is string => !!t)
      .map(t => t.trim());
  }

  async findEntriesByTranslations(translations: string[], limit = 50): Promise<EntrySummary[]> {
    const normalizedTranslations = translations
      .map(t => t.toLowerCase().trim())
      .filter(Boolean);

    if (normalizedTranslations.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectFrom('wced_head as h')
      .innerJoin('wced_translation as t', 'h.entryid', 't.entryid')
      .select([
        'h.entryid',
        'h.head',
        'h.normalized_head',
        'h.pos',
        sql<string>`(SELECT json_group_array(translation) FROM wced_translation WHERE entryid = h.entryid)`.as('translations')
      ])
      .where('h.type', '=', 'm')
      .where(sql`lower(t.translation)`, 'in', normalizedTranslations)
      .groupBy('h.entryid')
      .limit(limit)
      .execute();

    return rows.map(r => ({
      entryId: r.entryid as number,
      headword: r.head as string,
      normalizedHead: r.normalized_head as string,
      pos: r.pos ?? undefined,
      translations: JSON.parse(r.translations || '[]').filter(Boolean)
    }));
  }

  async findRhymes(params: RhymeSearchParams): Promise<RhymeCandidate[]> {
    const { 
      targetNucleus, 
      targetCoda, 
      targetSyllableCount, 
      allophoneNuclei, 
      similarCodas, 
      limit = 25, 
      offset = 0,
      maxSyllableOffset
    } = params;

    let query = this.db
      .selectFrom('wced_head')
      .select([
        '_id as entryId',
        'head as headword',
        'normalized_head as normalizedHead',
        'pos',
        sql<number>`json_extract(metadata, '$.syllableCount')`.as('syllableCount'),
        // Return the raw rhyme object for display/filtering
        sql<string>`json_extract(metadata, '$.rhyme')`.as('rhymeJson'),
        sql<number>`(
          CASE 
            WHEN json_extract(metadata, '$.rhyme.nucleus') = ${targetNucleus} 
             AND json_extract(metadata, '$.rhyme.coda') = ${targetCoda} 
            THEN 100
            WHEN json_extract(metadata, '$.rhyme.nucleus') IN (${sql.join(allophoneNuclei)}) 
             AND json_extract(metadata, '$.rhyme.coda') = ${targetCoda} 
            THEN 75
            WHEN json_extract(metadata, '$.rhyme.nucleus') = ${targetNucleus} 
             AND json_extract(metadata, '$.rhyme.coda') IN (${sql.join(similarCodas)}) 
            THEN 60
            ELSE 40
          END
          + (CASE WHEN json_extract(metadata, '$.syllableCount') = ${targetSyllableCount} THEN 5 ELSE 0 END)
        )`.as('score')
      ])
      .where(sql`json_extract(metadata, '$.rhyme.nucleus')`, 'in', allophoneNuclei);

    if (maxSyllableOffset !== undefined) {
      const min = targetSyllableCount - maxSyllableOffset;
      const max = targetSyllableCount + maxSyllableOffset;
      query = query
        .where(sql`json_extract(metadata, '$.syllableCount')`, '>=', min)
        .where(sql`json_extract(metadata, '$.syllableCount')`, '<=', max);
    }

    const rows = await query
      .orderBy('score', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    return rows.map(r => ({
      entryId: r.entryId as number,
      headword: r.headword as string,
      normalizedHead: r.normalizedHead as string,
      pos: r.pos as string,
      score: r.score as number,
      syllableCount: r.syllableCount as number,
      rhyme: JSON.parse(r.rhymeJson as string),
      rhymeType: r.score >= 100 ? 'perfect' : r.score >= 75 ? 'family' : r.score >= 60 ? 'additive' : 'assonance'
    })) as RhymeCandidate[];
  }

  async findAnagrams(word: string, limit = 25): Promise<EntrySummary[]> {
    const normalizedInput = word.toLowerCase().trim();
    const key = normalizedInput.replace(/[^a-z0-9]/gi, '');
    if (!key) {
      return [];
    }

    const sortedKey = key.split('').sort().join('');

    const rows = await this.db
      .selectFrom('wced_head as h')
      .innerJoin('wced_translation as t', 'h.entryid', 't.entryid')
      .select([
        'h.entryid',
        'h.head',
        'h.normalized_head',
        'h.pos',
        sql<string>`json_group_array(t.translation)`.as('translations')
      ])
      .where('h.type', '=', 'm')
      .where(sql`json_extract(h.metadata, '$.sortedChars')`, '=', sortedKey)
      .where('h.normalized_head', '!=', normalizedInput)
      .groupBy('h.entryid')
      .limit(limit)
      .execute();

    return rows
      .map(r => ({
        entryId: r.entryid as number,
        headword: r.head as string,
        normalizedHead: r.normalized_head as string,
        pos: r.pos ?? undefined,
        translations: JSON.parse(r.translations || '[]').filter(Boolean)
      }));
  }
}
