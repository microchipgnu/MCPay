import { serve } from '@hono/node-server';
import 'dotenv/config';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { Context, Hono } from 'hono';
import { db } from './db/client.js';
import { mcpServers, rpcLogs } from './db/schema.js';
import { inspectMcp } from './inspect/mcp.js';
import { cors } from 'hono/cors';

const app = new Hono();
app.use(
  cors({
    origin: (origin) => {
      // Allow all origins, or customize as needed
      return origin ?? "*";
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

app.get('/health', (c: Context) => c.json({ ok: true }));

app.post('/ingest/rpc', async (c: Context) => {
  const expected = process.env.INGESTION_SECRET;
  if (expected) {
    const auth = c.req.header('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const alt = c.req.header('x-api-key') || '';
    const provided = bearer || alt;
    if (!provided || provided !== expected) {
      return c.json({ error: 'unauthorized' }, 401);
    }
  }

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid_json' }, 400);

  try {
    const asArray = Array.isArray(body) ? body : [body];

    const sanitizeOrigin = (raw: string) => {
      try {
        const u = new URL(raw);
        u.search = '';
        u.hash = '';
        return u.toString();
      } catch {
        return raw;
      }
    };

    const parseTimestamp = (input: any): Date | undefined => {
      if (input == null) return undefined;
      if (input instanceof Date) return input;
      if (typeof input === 'number') {
        const ms = input > 1e12 ? input : input * 1000;
        return new Date(ms);
      }
      if (typeof input === 'string') {
        const asNum = Number(input);
        if (!Number.isNaN(asNum)) {
          const ms = asNum > 1e12 ? asNum : asNum * 1000;
          return new Date(ms);
        }
        const d = new Date(input);
        if (!Number.isNaN(d.getTime())) return d;
      }
      return undefined;
    };

    const rows = await Promise.all(
      asArray.map(async (entry: any) => {
        const ts = parseTimestamp(entry.ts ?? entry.timestamp ?? entry.time ?? entry.date);

        const originRaw = entry.origin_raw ?? entry.originRaw ?? entry.origin;
        const origin = originRaw ? sanitizeOrigin(originRaw) : undefined;

        let serverId = entry.server_id ?? entry.serverId;
        if (!serverId && originRaw) {
          const found = await db
            .select({ id: mcpServers.id })
            .from(mcpServers)
            .where(eq(mcpServers.originRaw, originRaw));
          if (found.length > 0) serverId = found[0].id;
        }
        if (!serverId && origin) {
          const found2 = await db
            .select({ id: mcpServers.id })
            .from(mcpServers)
            .where(eq(mcpServers.origin, origin));
          if (found2.length > 0) serverId = found2[0].id;
        }

        const req = entry.request ?? entry.req ?? {};
        const res = entry.response ?? entry.res ?? {};

        const method = req?.method ?? entry.method ?? 'unknown';
        const durationMsRaw =
          entry.duration_ms ?? entry.durationMs ?? entry.response_time_ms ?? entry.responseTimeMs;
        let durationMs =
          typeof durationMsRaw === 'number'
            ? durationMsRaw
            : typeof durationMsRaw === 'string'
              ? Number(durationMsRaw)
              : undefined;
        if (typeof durationMs === 'number' && Number.isNaN(durationMs)) durationMs = undefined;

        let meta: any = entry.meta ?? entry.metadata ?? {};
        if (meta == null || typeof meta !== 'object') meta = { value: meta };

        return {
          ts,
          serverId,
          originRaw,
          origin,
          method,
          request: req,
          response: res,
          meta,
        };
      })
    );

    if (rows.length === 0) return c.json({ ok: true, inserted: 0 });

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await db.insert(rpcLogs).values(chunk as any);
    }

    return c.json({ ok: true, inserted: rows.length });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.post('/index/run', async (c: Context) => {
  const body = await c.req.json().catch(() => null);
  const origin = body?.origin as string | undefined;
  if (!origin) return c.json({ error: 'missing_origin' }, 400);

  try {
    // Only strip query/hash if sensitive parameters are present (e.g. API key in query)
    const originRaw = origin;
    let displayOrigin = originRaw;
    try {
      const u = new URL(originRaw);
      // Check for known sensitive keys
      const sensitiveKeys = ['api_key', 'apikey', 'access_token', 'token', 'key', 'auth', 'api-key'];
      const queryKeys = Array.from(u.searchParams.keys()).map(k => k.toLowerCase());
      const hasSensitive = sensitiveKeys.some(k => queryKeys.includes(k));
      if (hasSensitive) {
        u.search = '';
        u.hash = '';
        displayOrigin = u.toString();
      }
    } catch { }

    // Perform rich inspection via MCP client (best-effort)
    const inspection = await inspectMcp(originRaw).catch(() => null);

    const now = new Date();
    const doc = {
      originRaw,
      origin: displayOrigin,
      lastSeenAt: now,
      indexedAt: now,
      status: inspection ? 'ok' : 'error',
      data: inspection ?? {},
    };

    // Upsert by origin_raw
    const existing = await db.select().from(mcpServers).where(eq(mcpServers.originRaw, originRaw));
    let id = existing[0]?.id;
    if (existing.length > 0) {
      await db.update(mcpServers).set(doc).where(eq(mcpServers.originRaw, originRaw));
    } else {
      const result = await db.insert(mcpServers).values(doc).returning({ id: mcpServers.id });
      id = result[0].id;
    }

    return c.json({ ok: true, serverId: id });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/servers', async (c: Context) => {
  try {
    // Parse pagination
    const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') ?? '12', 10)))
    const offset = Math.max(0, parseInt(c.req.query('offset') ?? '0', 10))

    // Moderation filter: include=approved|all (default approved)
    const include = (c.req.query('include') ?? 'approved').toLowerCase();
    const includeApprovedOnly = include !== 'all';

    // Sorting: sort=score|recent (default score)
    const sort = (c.req.query('sort') ?? 'score').toLowerCase();

    // Get total count for pagination metadata
    const totalQuery = db.select({ count: sql`count(*)` }).from(mcpServers);
    if (includeApprovedOnly) {
      // @ts-ignore drizzle infers correct types from schema
      // count only approved when includeApprovedOnly
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (totalQuery as any).where(eq(mcpServers.moderationStatus, 'approved'));
    }
    const [{ count }] = await totalQuery;

    // Fetch paginated results
    const base = db
      .select({
        id: mcpServers.id,
        origin: mcpServers.origin,
        status: mcpServers.status,
        moderation_status: mcpServers.moderationStatus,
        last_seen_at: mcpServers.lastSeenAt,
        quality_score: mcpServers.qualityScore,
        data: mcpServers.data,
      })
      .from(mcpServers);

    const filtered = includeApprovedOnly
      ? base.where(eq(mcpServers.moderationStatus, 'approved'))
      : base;

    const ordered = sort === 'recent'
      ? filtered.orderBy(desc(mcpServers.lastSeenAt))
      : filtered.orderBy(desc(mcpServers.qualityScore), desc(mcpServers.lastSeenAt));

    const rows = await ordered.limit(limit).offset(offset);

    const servers = rows.map(row => ({
      id: row.id,
      origin: row.origin,
      status: row.status,
      moderation_status: row.moderation_status,
      quality_score: row.quality_score,
      last_seen_at: row.last_seen_at,
      // @ts-ignore
      tools: row.data?.tools || [],
      server: {
        info: {
          // @ts-ignore
          name: row.data?.server?.info?.name || '',
          // @ts-ignore
          description: row.data?.server?.info?.description || '',
          // @ts-ignore
          icon: row.data?.server?.info?.icon || '',
        },
      }
    }));

    return c.json({ 
      servers,
      total: Number(count),
      limit,
      offset,
      nextOffset: offset + servers.length < Number(count) ? offset + servers.length : null,
      hasMore: offset + servers.length < Number(count),
    });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/server/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const rows = await db
      .select({
        id: mcpServers.id,
        origin: mcpServers.origin,
        originRaw: mcpServers.originRaw,
        status: mcpServers.status,
        moderationStatus: mcpServers.moderationStatus,
        qualityScore: mcpServers.qualityScore,
        lastSeenAt: mcpServers.lastSeenAt,
        indexedAt: mcpServers.indexedAt,
        data: mcpServers.data,
      })
      .from(mcpServers)
      .where(eq(mcpServers.id, id));

    if (rows.length === 0) return c.json({ error: 'not_found' }, 404);

    const server = rows[0];

    // Pull recent RPC logs for this server to derive lightweight analytics
    const logs = await db
      .select({
        id: rpcLogs.id,
        ts: rpcLogs.ts,
        method: rpcLogs.method,
        request: rpcLogs.request,
        response: rpcLogs.response,
        meta: rpcLogs.meta,
      })
      .from(rpcLogs)
      .where(eq(rpcLogs.serverId, id))
      .orderBy(desc(rpcLogs.ts))
      .limit(500);

    const toLowerCaseHeaders = (h: unknown): Record<string, unknown> => {
      if (!h || typeof h !== 'object') return {};
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
        out[String(k).toLowerCase()] = v;
      }
      return out;
    };

    const safeBase64Decode = (input: unknown): string | undefined => {
      if (typeof input !== 'string' || input.length === 0) return undefined;
      try {
        const decoded = Buffer.from(input, 'base64').toString('utf8');
        return decoded;
      } catch {
        return undefined;
      }
    };

    const safeJsonParse = (input: unknown): unknown => {
      if (typeof input !== 'string' || input.length === 0) return undefined;
      try {
        return JSON.parse(input);
      } catch {
        return undefined;
      }
    };

    const detectPayment = (req: unknown, res: unknown, meta: unknown) => {
      const request = (req && typeof req === 'object') ? (req as Record<string, unknown>) : {};
      const response = (res && typeof res === 'object') ? (res as Record<string, unknown>) : {};
      const metaObj = (meta && typeof meta === 'object') ? (meta as Record<string, unknown>) : {};

      const headersLc = toLowerCaseHeaders((request as { headers?: unknown }).headers);
      const headerToken = (headersLc['x-payment'] as string | undefined) || undefined;

      const paramsObj = ((request as { params?: unknown }).params && typeof (request as { params?: unknown }).params === 'object'
        ? (request as { params?: Record<string, unknown> }).params
        : undefined);
      const reqMeta = (paramsObj && typeof (paramsObj as any)._meta === 'object'
        ? ((paramsObj as any)._meta as Record<string, unknown>)
        : undefined);
      const reqMetaToken = reqMeta && (reqMeta['x402/payment'] as string | undefined);
      const metaToken = metaObj && (metaObj['x402/payment'] as string | undefined);

      const resMeta = (response._meta as Record<string, unknown> | undefined) || undefined;
      const paymentResponse = resMeta && (resMeta['x402/payment-response'] as Record<string, unknown> | undefined);
      const x402Error = resMeta && (resMeta['x402/error'] as { accepts?: unknown } | undefined);

      const hasPayment = !!paymentResponse;
      const paymentRequestRaw = reqMetaToken || metaToken;
      const paymentRequestDecoded = safeBase64Decode(paymentRequestRaw) ?? paymentRequestRaw;
      const paymentRequestJson = typeof paymentRequestDecoded === 'string' ? safeJsonParse(paymentRequestDecoded) : undefined;
      const paymentRequested = !!((x402Error && Array.isArray(x402Error.accepts)) || paymentRequestRaw);
      const paymentProvided = !!(headerToken || reqMetaToken || metaToken);

      return {
        hasPayment, paymentRequested, paymentProvided, metadata: {
          paymentResponse,
          x402Error,
          paymentRequest: paymentRequestJson,
        }
      };
    };

    const detectVLayerProof = (req: unknown, res: unknown, meta: unknown) => {
      const response = (res && typeof res === 'object') ? (res as Record<string, unknown>) : {};
      const metaObj = (meta && typeof meta === 'object') ? (meta as Record<string, unknown>) : {};

      const resMeta = (response._meta as Record<string, unknown> | undefined) || undefined;
      const proofFromResponse = resMeta && (resMeta['vlayer/proof'] as Record<string, unknown> | undefined);
      const proofFromMeta = metaObj && (metaObj['vlayer/proof'] as Record<string, unknown> | undefined);
      
      const proof = proofFromResponse || proofFromMeta;
      const hasProof = !!proof;

      return {
        hasProof,
        proof: proof ? {
          success: proof.success,
          version: proof.version,
          notaryUrl: (proof.meta as Record<string, unknown> | undefined)?.notaryUrl,
          valid: proof.valid,
          generatedAt: proof.generatedAt,
        } : undefined,
      };
    };

    // Build summary
    const totalRequests = logs.length;
    const lastActivity = logs[0]?.ts ?? server.lastSeenAt;

    // Derive recent payments from logs where payment response present
    const payments = logs
      .map(l => ({ 
        l, 
        p: detectPayment(l.request, l.response, l.meta),
        v: detectVLayerProof(l.request, l.response, l.meta)
      }))
      .filter(x => !!x.p.hasPayment)
      .slice(0, 50)
      .map(x => {
        const pr = x.p.metadata.paymentResponse as any | undefined;
        const preq = x.p.metadata.paymentRequest as any | undefined;
        
        // Extract amount and currency like minimal-explorer
        const amountFormatted = (() => {
          // 6 decimals: value is a stringified integer, e.g., "100000" => "0.1"
          const raw = preq?.payload?.authorization?.value;
          if (!raw || isNaN(Number(raw))) return '';
          // Always divide by 1e6 and show up to 6 decimals (remove trailing zeros)
          return (Number(raw) / 1e6).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 6,
          });
        })();
        
        const vlayerProof = x.v.hasProof && x.v.proof ? {
          success: x.v.proof.success === true,
          version: x.v.proof.version,
          notaryUrl: x.v.proof.notaryUrl,
          valid: x.v.proof.valid === true,
          generatedAt: x.v.proof.generatedAt,
        } : undefined;
        
        return {
          id: x.l.id,
          createdAt: x.l.ts,
          status: pr?.success === false ? 'failed' : 'completed',
          network: pr?.network,
          transactionHash: pr?.transaction,
          payer: pr?.payer,
          amountFormatted,
          currency: pr ? "USDC" : undefined,
          vlayerProof,
      };
    });

    // Daily analytics: count by day for recent 30 days based on available logs
    const byDay = new Map<string, number>();
    for (const l of logs) {
      const d = new Date(l.ts!);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }
    const dailyAnalytics = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 30)
      .map(([date, totalRequests]) => ({ date, totalRequests }));

    // Extract basic info and tools from inspection data
    const name = (server.data as any)?.server?.info?.name || '';
    const description = (server.data as any)?.server?.info?.description || '';
    const icon = (server.data as any)?.server?.info?.icon || '';
    const tools = Array.isArray((server.data as any)?.tools) ? (server.data as any).tools : [];

    const payload = {
      serverId: server.id,
      origin: server.origin,
      originRaw: server.originRaw,
      status: server.status,
      moderationStatus: server.moderationStatus,
      qualityScore: server.qualityScore,
      lastSeenAt: server.lastSeenAt,
      indexedAt: server.indexedAt,
      info: { name, description, icon },
      tools,
      summary: {
        lastActivity,
        totalTools: Array.isArray(tools) ? tools.length : 0,
        totalRequests,
        totalPayments: payments.length,
      },
      dailyAnalytics,
      recentPayments: payments,
    };

    return c.json(payload);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/explorer', async (c: Context) => {
  // Parse optional ?limit and ?offset query params for pagination
  const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') ?? '5', 10))) // default 5, max 100
  const offset = Math.max(0, parseInt(c.req.query('offset') ?? '0', 10))
  
  // Filter by moderation status: include=approved|all (default approved)
  const include = (c.req.query('include') ?? 'approved').toLowerCase();
  const includeApprovedOnly = include !== 'all';

  // Base query with join
  const baseQuery = db
    .select({
      id: rpcLogs.id,
      ts: rpcLogs.ts,
      serverId: rpcLogs.serverId,
      origin: rpcLogs.origin,
      originRaw: rpcLogs.originRaw,
      method: rpcLogs.method,
      request: rpcLogs.request,
      response: rpcLogs.response,
      meta: rpcLogs.meta,
      serverData: mcpServers.data,
      serverOrigin: mcpServers.origin,
      serverModerationStatus: mcpServers.moderationStatus,
    })
    .from(rpcLogs)
    .leftJoin(mcpServers, eq(rpcLogs.serverId, mcpServers.id));

  // Apply moderation filter
  const filteredQuery = includeApprovedOnly
    ? baseQuery.where(eq(mcpServers.moderationStatus, 'approved'))
    : baseQuery;

  // Get total count for pagination metadata
  const countQuery = db.select({ count: sql`count(*)` }).from(rpcLogs).leftJoin(mcpServers, eq(rpcLogs.serverId, mcpServers.id));
  const countFilteredQuery = includeApprovedOnly
    ? countQuery.where(eq(mcpServers.moderationStatus, 'approved'))
    : countQuery;
  const [{ count }] = await countFilteredQuery;

  // Fetch paginated results
  const rows = await filteredQuery
    .orderBy(desc(rpcLogs.ts))
    .limit(limit)
    .offset(offset);

  const toLowerCaseHeaders = (h: unknown): Record<string, unknown> => {
    if (!h || typeof h !== 'object') return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
      out[String(k).toLowerCase()] = v;
    }
    return out;
  };

  const safeBase64Decode = (input: unknown): string | undefined => {
    if (typeof input !== 'string' || input.length === 0) return undefined;
    try {
      // decode base64 to utf8; if it fails, return undefined
      const decoded = Buffer.from(input, 'base64').toString('utf8');
      return decoded;
    } catch {
      return undefined;
    }
  };

  const safeJsonParse = (input: unknown): unknown => {
    if (typeof input !== 'string' || input.length === 0) return undefined;
    try {
      return JSON.parse(input);
    } catch {
      return undefined;
    }
  };

  const detectPayment = (req: unknown, res: unknown, meta: unknown) => {
    const request = (req && typeof req === 'object') ? (req as Record<string, unknown>) : {};
    const response = (res && typeof res === 'object') ? (res as Record<string, unknown>) : {};
    const metaObj = (meta && typeof meta === 'object') ? (meta as Record<string, unknown>) : {};

    const headersLc = toLowerCaseHeaders((request as { headers?: unknown }).headers);
    const headerToken = (headersLc['x-payment'] as string | undefined) || undefined;

    const paramsObj = ((request as { params?: unknown }).params && typeof (request as { params?: unknown }).params === 'object'
      ? (request as { params?: Record<string, unknown> }).params
      : undefined);
    const reqMeta = (paramsObj && typeof (paramsObj as any)._meta === 'object'
      ? ((paramsObj as any)._meta as Record<string, unknown>)
      : undefined);
    const reqMetaToken = reqMeta && (reqMeta['x402/payment'] as string | undefined);
    const metaToken = metaObj && (metaObj['x402/payment'] as string | undefined);

    const resMeta = (response._meta as Record<string, unknown> | undefined) || undefined;
    const paymentResponse = resMeta && (resMeta['x402/payment-response'] as Record<string, unknown> | undefined);
    const x402Error = resMeta && (resMeta['x402/error'] as { accepts?: unknown } | undefined);

    const hasPayment = !!paymentResponse;
    const paymentRequestRaw = reqMetaToken || metaToken;
    const paymentRequestDecoded = safeBase64Decode(paymentRequestRaw) ?? paymentRequestRaw;
    const paymentRequestJson = typeof paymentRequestDecoded === 'string' ? safeJsonParse(paymentRequestDecoded) : undefined;
    const paymentRequested = !!((x402Error && Array.isArray(x402Error.accepts)) || paymentRequestRaw);
    const paymentProvided = !!(headerToken || reqMetaToken || metaToken);

    return {
      hasPayment, paymentRequested, paymentProvided, metadata: {
        paymentResponse,
        x402Error,
        paymentRequest: paymentRequestJson,
      }
    };
  };

  const stats = rows.map((r) => {
    // @ts-ignore
    const name = (r.serverData && (r.serverData as any)?.server?.info?.name) || '';
    const payment = detectPayment(r.request, r.response, r.meta);
    return {
      id: r.id,
      ts: r.ts,
      method: r.method,
      serverId: r.serverId,
      serverName: name,
      payment,
    };
  });

  return c.json({
    stats,
    total: Number(count),
    limit,
    offset,
    nextOffset: offset + stats.length < Number(count) ? offset + stats.length : null,
    hasMore: offset + stats.length < Number(count),
  });
});

app.post('/servers/:id/moderate', async (c: Context) => {
  const expected = process.env.MODERATION_SECRET;
  const provided = c.req.header('authorization')?.startsWith('Bearer ')
    ? c.req.header('authorization')!.slice(7)
    : c.req.header('x-api-key') || '';
  if (expected && provided !== expected) return c.json({ error: 'unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const nextStatus = (body?.status as string | undefined)?.toLowerCase();
  const notes = (body?.notes as string | undefined) ?? undefined;
  const verifiedBy = (body?.verifiedBy as string | undefined) ?? undefined;

  const allowed: Record<string, true> = {
    pending: true,
    approved: true,
    rejected: true,
    disabled: true,
    flagged: true,
  };
  if (!nextStatus || !allowed[nextStatus]) return c.json({ error: 'invalid_status' }, 400);

  const now = new Date();
  const set: any = {
    moderationStatus: nextStatus as any,
    moderationNotes: notes,
    verifiedBy,
    verifiedAt: nextStatus === 'approved' ? now : null,
    updatedAt: now,
  };

  await db.update(mcpServers).set(set).where(eq(mcpServers.id, id));
  return c.json({ ok: true });
});

// Minimal scoring function v1
async function computeQualityScoreForServer(serverId: string): Promise<number> {
  // Look back last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const logs = await db
    .select({ ts: rpcLogs.ts, req: rpcLogs.request, res: rpcLogs.response })
    .from(rpcLogs)
    .where(eq(rpcLogs.serverId, serverId))
    .orderBy(desc(rpcLogs.ts));

  const total = logs.length;
  if (total === 0) return 0;

  // success heuristic: presence of response object
  const successes = logs.filter((l) => !!l.res && typeof l.res === 'object').length;
  const successRate = successes / Math.max(1, total); // [0,1]

  // latency heuristic: expect meta.durationMs in response or request
  const durations = logs
    .map((l) => {
      const src: any = l.res || l.req || {};
      const ms = Number((src._meta && (src._meta.durationMs ?? src._meta.duration_ms)) ?? (src.durationMs ?? src.duration_ms));
      return Number.isFinite(ms) ? ms : undefined;
    })
    .filter((x): x is number => typeof x === 'number');

  const sorted = [...durations].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(0.95 * (sorted.length - 1))] : undefined;
  const latencyScore = p95 != null ? Math.max(0, Math.min(1, 1 - p95 / 2000)) : 0.5; // 2s p95 => 0

  // error heuristic: look for _meta.x402/error or response.error
  const errors = logs.filter((l) => {
    const r: any = l.res || {};
    const meta = (r._meta as any) || {};
    return !!(r.error || meta['x402/error']);
  }).length;
  const errorRate = errors / Math.max(1, total);

  const score = Math.round(
    100 * (0.6 * successRate + 0.3 * latencyScore + 0.1 * (1 - errorRate))
  );
  return Math.max(0, Math.min(100, score));
}

app.post('/score/recompute', async (c: Context) => {
  const expected = process.env.MODERATION_SECRET;
  const provided = c.req.header('authorization')?.startsWith('Bearer ')
    ? c.req.header('authorization')!.slice(7)
    : c.req.header('x-api-key') || '';
  if (expected && provided !== expected) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json().catch(() => ({}));
  const id = (body?.id as string | undefined) ?? undefined;

  if (id) {
    const score = await computeQualityScoreForServer(id);
    await db.update(mcpServers).set({ qualityScore: score, updatedAt: new Date() }).where(eq(mcpServers.id, id));
    return c.json({ ok: true, updated: 1, score });
  } else {
    // recompute for top N recent servers to bound work
    const servers = await db
      .select({ id: mcpServers.id })
      .from(mcpServers)
      .orderBy(desc(mcpServers.lastSeenAt))
      .limit(200);

    let updated = 0;
    for (const s of servers) {
      const score = await computeQualityScoreForServer(s.id);
      await db.update(mcpServers).set({ qualityScore: score, updatedAt: new Date() }).where(eq(mcpServers.id, s.id));
      updated += 1;
    }
    return c.json({ ok: true, updated });
  }
});


const port = 3010;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[MCP-DATA] running on http://localhost:${info.port}`);
});


