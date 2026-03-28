import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Index for exact vowel/nucleus matching (used for perfect, family, and assonance rhymes)
  await db.schema
    .createIndex('idx_wced_head_rhyme_nucleus')
    .on('wced_head')
    .expression(sql`json_extract(metadata, '$.rhyme.nucleus')`)
    .execute();

  // Index for exact coda matching (used for perfect rhymes)
  await db.schema
    .createIndex('idx_wced_head_rhyme_coda')
    .on('wced_head')
    .expression(sql`json_extract(metadata, '$.rhyme.coda')`)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_wced_head_rhyme_nucleus').execute();
  await db.schema.dropIndex('idx_wced_head_rhyme_coda').execute();
}
