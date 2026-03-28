import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('wced_head')
    // Define as a blob to utilize SQLite's native JSONB format
    .addColumn('metadata', 'blob') 
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('wced_head')
    .dropColumn('metadata')
    .execute();
}