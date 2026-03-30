import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Index for anagram lookup by precomputed sorted chars in metadata
  await db.schema
    .createIndex('idx_wced_head_sorted_chars')
    .on('wced_head')
    .expression(sql`json_extract(metadata, '$.sortedChars')`)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_wced_head_sorted_chars').execute();
}
