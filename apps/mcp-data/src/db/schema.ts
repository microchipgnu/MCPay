import { pgTable, text, uuid, jsonb, timestamp, integer, index, pgEnum } from 'drizzle-orm/pg-core';

export const serverModerationStatus = pgEnum('server_moderation_status', [
  'pending',
  'approved',
  'rejected',
  'disabled',
  'flagged',
]);

export const mcpServers = pgTable(
  'mcp_servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // origin_raw is the full unredacted URL (may include secrets in query)
    originRaw: text('origin_raw').notNull().unique(),
    // origin is a sanitized display variant (no query/fragment)
    origin: text('origin').notNull(),
    // Consolidated JSON blob for most server attributes (title, tags, tools, resources, capabilities, metadata, etc.)
    data: jsonb('data').$type<unknown>().default({}),
    // Existing crawl/health status string (e.g., 'ok' | 'error' ...)
    status: text('status'),
    // New moderation workflow status
    moderationStatus: serverModerationStatus('moderation_status').notNull().default('pending'),
    // Optional moderation notes for reviewers
    moderationNotes: text('moderation_notes'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: text('verified_by'),
    // Overall numeric quality score (0-100)
    qualityScore: integer('quality_score').notNull().default(0),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    indexedAt: timestamp('indexed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // GIN index on data for flexible JSONB search (e.g., tags/title/capabilities)
    index('idx_mcp_servers_data').using('gin', table.data),
    index('idx_mcp_servers_moderation_status').on(table.moderationStatus),
    index('idx_mcp_servers_score').on(table.qualityScore),
  ]
);

export const rpcLogs = pgTable(
  'rpc_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ts: timestamp('ts', { withTimezone: true }).defaultNow(),
    // Linkage and addressing
    serverId: uuid('server_id').references(() => mcpServers.id),
    originRaw: text('origin_raw'),
    origin: text('origin'),
    // JSON-RPC extracted fields
    method: text('method'),
    // Raw payloads
    request: jsonb('request').$type<unknown>().default({}),
    response: jsonb('response').$type<unknown>().default({}),
    meta: jsonb('meta').$type<unknown>().default({}),
  },
  (table) => [
    index('idx_rpc_logs_origin_ts').on(table.origin, table.ts),
    index('idx_rpc_logs_server_ts').on(table.serverId, table.ts),
    index('idx_rpc_logs_method_ts').on(table.method, table.ts),
    index('idx_rpc_logs_request').using('gin', table.request),
    index('idx_rpc_logs_response').using('gin', table.response),
  ]
);

