import type { Hono } from "hono";
import { auth } from "../auth.js";
import { getSessionFromHeaders } from "../utils/auth-helpers.js";

export function registerAuthRoutes(app: Hono) {
    // Mount Better Auth for all methods on /api/auth/*
    // This handles GET, POST, OPTIONS, etc.
    app.all("/api/auth/*", async (c) => {
        return await auth.handler(c.req.raw);
    });

    // Get current user info
    app.get("/api/me", async (c) => {
        const session = await getSessionFromHeaders(c.req.raw.headers);
        if (!session) {
            return c.json({ user: null }, 401);
        }
        return c.json({ user: session.user });
    });
}

