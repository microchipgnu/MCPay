import type { Hono } from "hono";
import { requireAuth, handleError } from "../utils/auth-helpers.js";
import { createOneClickBuyUrl } from "../3rd-parties/cdp/onramp/index.js";

type OnrampUrlBody = {
    walletAddress: string;
    network?: string;
    asset?: string;
    amount?: number;
    currency?: string;
    redirectUrl?: string;
};

export function registerOnrampRoutes(app: Hono) {
    // Preflight
    app.options("/api/onramp/*", (c) => {
        return c.body(null, 204);
    });

    // Create one-click buy URL
    app.post("/api/onramp/url", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const body = (await c.req.json().catch(() => ({}))) as Partial<OnrampUrlBody>;
            const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
            
            if (!walletAddress) {
                return c.json({ error: "Missing walletAddress" }, 400);
            }

            const url = await createOneClickBuyUrl(walletAddress, {
                network: typeof body.network === "string" && body.network ? body.network : undefined,
                asset: typeof body.asset === "string" && body.asset ? body.asset : undefined,
                amount: typeof body.amount === "number" && !Number.isNaN(body.amount) ? body.amount : undefined,
                currency: typeof body.currency === "string" && body.currency ? body.currency : undefined,
                userId: authContext.user.id,
                redirectUrl: typeof body.redirectUrl === "string" && body.redirectUrl ? body.redirectUrl : undefined,
            });

            return c.json({ url });
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });
}

