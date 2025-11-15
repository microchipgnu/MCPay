import type { Hono } from "hono";
import { registerAuthRoutes } from "./auth.js";
import { registerOnrampRoutes } from "./onramp.js";
import { registerWalletRoutes } from "./wallets.js";
import { registerBalanceRoutes } from "./balance.js";
import { registerApiKeyRoutes } from "./api-keys.js";
import { registerMcpRoutes } from "./mcp-handler.js";
import { registerUIRoutes } from "./ui.js";

export function registerAllRoutes(app: Hono) {
    // Health check
    app.get("/health", (c) => {
        return c.json({ status: "ok" });
    });

    // Register all route modules
    registerAuthRoutes(app);
    registerOnrampRoutes(app);
    registerWalletRoutes(app);
    registerBalanceRoutes(app);
    registerApiKeyRoutes(app);
    registerMcpRoutes(app);
    registerUIRoutes(app);
}

