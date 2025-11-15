import type { Hono } from "hono";
import { requireAuth, handleError } from "../utils/auth-helpers.js";
import { auth } from "../auth.js";
import { SECONDS_PER_DAY } from "../utils/constants.js";

interface CreateApiKeyBody {
    name?: string;
    prefix?: string;
    remaining?: number;
    metadata?: Record<string, unknown>;
    permissions?: Record<string, string[]>;
    expiresIn?: number;
    expiresInDays?: number;
    rateLimitEnabled?: boolean;
    rateLimitTimeWindow?: number;
    rateLimitMax?: number;
}

interface UpdateApiKeyBody {
    name?: string;
    enabled?: boolean;
    remaining?: number;
    refillAmount?: number;
    refillInterval?: number;
    metadata?: Record<string, unknown>;
    permissions?: Record<string, string[]> | null;
}

interface VerifyApiKeyBody {
    key: string;
    permissions?: Record<string, string[]>;
}

export function registerApiKeyRoutes(app: Hono) {
    // Preflight
    app.options("/api/keys/*", (c) => {
        return c.body(null, 204);
    });

    // List current user's keys
    app.get("/api/keys", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const keys = await auth.api.listApiKeys({ headers: c.req.raw.headers });
            return c.json(keys);
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });

    // Create new key for current user
    app.post("/api/keys", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const body = (await c.req.json().catch(() => ({}))) as CreateApiKeyBody;

            const expiresIn = typeof body.expiresIn === "number"
                ? body.expiresIn
                : (typeof body.expiresInDays === "number" ? Math.floor(body.expiresInDays * SECONDS_PER_DAY) : undefined);

            const payload = {
                userId: authContext.user.id,
                name: body.name,
                prefix: body.prefix,
                remaining: body.remaining,
                metadata: body.metadata,
                permissions: body.permissions,
                expiresIn,
                rateLimitEnabled: body.rateLimitEnabled,
                rateLimitTimeWindow: body.rateLimitTimeWindow,
                rateLimitMax: body.rateLimitMax,
            };

            const created = await auth.api.createApiKey({ body: payload, headers: c.req.raw.headers });
            return c.json(created, 201);
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });

    // Get by id (without returning secret key)
    app.get("/api/keys/:id", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const id = c.req.param("id");
            const data = await auth.api.getApiKey({ query: { id }, headers: c.req.raw.headers });
            return c.json(data);
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });

    // Update by id
    app.put("/api/keys/:id", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const id = c.req.param("id");
            const body = (await c.req.json().catch(() => ({}))) as UpdateApiKeyBody;

            const payload = {
                keyId: id,
                userId: authContext.user.id,
                name: body.name,
                enabled: body.enabled,
                remaining: body.remaining,
                refillAmount: body.refillAmount,
                refillInterval: body.refillInterval,
                metadata: body.metadata,
                permissions: body.permissions,
            };

            const updated = await auth.api.updateApiKey({ body: payload, headers: c.req.raw.headers });
            return c.json(updated);
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });

    // Delete by id
    app.delete("/api/keys/:id", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const id = c.req.param("id");
            const result = await auth.api.deleteApiKey({ body: { keyId: id }, headers: c.req.raw.headers });
            return c.json(result);
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });

    // Verify a presented key
    app.post("/api/keys/verify", async (c) => {
        try {
            const body = (await c.req.json().catch(() => ({}))) as VerifyApiKeyBody;
            if (!body.key || typeof body.key !== "string") {
                return c.json({ error: "Missing 'key' in body" }, 400);
            }

            const result = await auth.api.verifyApiKey({ body: { key: body.key, permissions: body.permissions } });
            return c.json(result);
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });
}

