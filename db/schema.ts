import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const credentials = sqliteTable('credentials', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    credential_string: text('credential_string').notNull(),
    parsed_credential: text('parsed_credential', { mode: 'json' }),
    credential_format: text('credential_format').notNull(),
    credential_claims: text('credential_claims', { mode: 'json' }),
    public_key: text('public_key', { mode: 'json' }).notNull(),
    private_key: text('private_key', { mode: 'json' }).notNull(),
    iss_date: integer('iss_date').notNull(),
    exp_date: integer('exp_date')
});

export const logs = sqliteTable('logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transaction_type: text('transaction_type').notNull(),
    status: text('status', { enum: ['success', 'failed', 'pending'] }).notNull(),
    details: text('details'),
    transaction_datetime: integer('transaction_datetime').notNull(),
    relying_party: text('relying_party')
});

export type Credential = typeof credentials.$inferSelect;
export type Log = typeof logs.$inferSelect;