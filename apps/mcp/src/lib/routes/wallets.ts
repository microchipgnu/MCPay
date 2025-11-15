import type { Hono } from "hono";
import { requireAuth, handleError } from "../utils/auth-helpers.js";
import { db } from "../auth.js";

export function registerWalletRoutes(app: Hono) {
    // Preflight
    app.options("/api/wallets", (c) => {
        return c.body(null, 204);
    });

    // List current user's wallets
    app.get("/api/wallets", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const includeInactive = c.req.query("includeInactive") === "true";

            const wallets = await db.query.userWallets.findMany({
                where: (t, { and, eq }) => {
                    const conditions = [eq(t.userId, authContext.user.id)];
                    if (!includeInactive) {
                        conditions.push(eq(t.isActive, true));
                    }
                    return and(...conditions);
                },
                orderBy: (t, { desc }) => [desc(t.isPrimary), desc(t.createdAt)],
            });

            return c.json(wallets);
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });
}

