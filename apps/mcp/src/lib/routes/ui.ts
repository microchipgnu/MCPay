import type { Hono } from "hono";
import { CONNECT_HTML } from "../../ui/connect.js";
import { USER_HTML } from "../../ui/user.js";
import { getSessionFromHeaders } from "../utils/auth-helpers.js";

export function registerUIRoutes(app: Hono) {
    app.get("/connect", async (c) => {
        const currentUrl = new URL(c.req.url);
        const continueParam =
            currentUrl.searchParams.get("continue") ||
            currentUrl.searchParams.get("return_to") ||
            currentUrl.searchParams.get("next");

        // If already authenticated, resume the original authorization flow
        const session = await getSessionFromHeaders(c.req.raw.headers);
        if (session) {
            if (continueParam) {
                return c.redirect(continueParam);
            }
            // Fallback: if this looks like an OIDC authorize request, forward it to the authorization endpoint
            const hasAuthorizeParams =
                currentUrl.searchParams.has("response_type") &&
                currentUrl.searchParams.has("client_id");
            if (hasAuthorizeParams) {
                const authorizeUrl = new URL("/api/auth/oauth/authorize", `${currentUrl.protocol}//${currentUrl.host}`);
                authorizeUrl.search = currentUrl.search; // preserve original authorize query
                return c.redirect(authorizeUrl.toString());
            }
            return c.redirect("/");
        }

        // Render a minimal page that initiates social sign-in on the client
        return c.html(CONNECT_HTML);
    });

    app.get("/", async (c) => {
        return c.html(USER_HTML);
    });
}

