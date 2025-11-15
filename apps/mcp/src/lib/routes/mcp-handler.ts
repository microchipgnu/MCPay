import type { Hono } from "hono";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata, withMcpAuth } from "better-auth/plugins";
import { LoggingHook, withProxy, createMcpHandler, Hook } from "mcpay/handler";
import { AnalyticsHook } from "mcpay/handler";
import { z } from "zod";
import { auth } from "../auth.js";
import { SecurityHook } from "../proxy/hooks/security-hook.js";
import { X402WalletHook } from "../proxy/hooks/x402-wallet-hook.js";
import { VLayerHook } from "../proxy/hooks/vlayer-hook.js";
import { analyticsSink } from "../analytics/index.js";
import { getSessionFromHeaders } from "../utils/auth-helpers.js";
import { extractApiKey, isVlayerEnabled, isTruthyHeader } from "../utils/header-helpers.js";
import { VLAYER_MAX_PROOF_SIZE, VLAYER_TIMEOUT_MS, VLAYER_RETRY_ATTEMPTS } from "../utils/constants.js";
import env from "../../env.js";

/**
 * Resolve target URL from request headers or query params (base64-encoded)
 */
async function resolveTargetUrl(req: Request): Promise<string | null> {
    const directUrlEncoded = req.headers.get("x-mcpay-target-url")
        ?? new URL(req.url).searchParams.get("target-url");

    if (directUrlEncoded) {
        try {
            // The value is base64-encoded, so decode it
            // decodeURIComponent in case it was URL-encoded as well
            const decoded = decodeURIComponent(atob(directUrlEncoded));
            return decoded;
        } catch {
            // If decoding fails, treat as invalid and fall through
        }
    }

    return null;
}

export function registerMcpRoutes(app: Hono) {
    // OAuth discovery endpoints
    app.options(".well-known/oauth-authorization-server", (c) => {
        return c.body(null, 204);
    });
    
    app.options(".well-known/oauth-protected-resource", (c) => {
        return c.body(null, 204);
    });

    app.get(".well-known/oauth-authorization-server", async (c) => {
        return await oAuthDiscoveryMetadata(auth)(c.req.raw);
    });
    
    app.get(".well-known/oauth-protected-resource", async (c) => {
        return await oAuthProtectedResourceMetadata(auth)(c.req.raw);
    });

    // Main MCP handler
    app.all("/mcp", async (c) => {
        const currentUrl = new URL(c.req.url);
        const targetUrlParam = currentUrl.searchParams.get("target-url");
        const hasId = !!currentUrl.searchParams.get("id");
        const shouldProxy = hasId || !!targetUrlParam;
        const original = c.req.raw;

        // Control flags via headers
        const disableMcpAuth = isTruthyHeader(original.headers.get("x-mcp-disable-auth"));
        const disableX402 = isTruthyHeader(original.headers.get("x-mcp-disable-x402")) || disableMcpAuth;

        if (shouldProxy) {
            const targetUrl = await resolveTargetUrl(original);
            if (!targetUrl) {
                return new Response("target-url missing", { status: 400 });
            }

            const isVlayerEnabledFlag = isVlayerEnabled(original);

            const withMcpProxy = (session: unknown) => {
                const hooks: Hook[] = [
                    // AnalyticsHook first so it runs LAST in reverse order (after all hooks modify response)
                    new AnalyticsHook(analyticsSink, targetUrl),
                    new LoggingHook(),
                ];
                
                if (!disableX402 && session) {
                    hooks.push(new X402WalletHook(session));
                }
                
                hooks.push(new SecurityHook());
                
                if (isVlayerEnabledFlag) {
                    hooks.push(new VLayerHook({
                        enabled: isVlayerEnabledFlag,
                        targetUrl: targetUrl,
                        logProofs: true,
                        attachToResponse: true,
                        validateProofs: true,
                        includeRequestDetails: true,
                        includeResponseDetails: true,
                        maxProofSize: VLAYER_MAX_PROOF_SIZE,
                        timeoutMs: VLAYER_TIMEOUT_MS,
                        retryAttempts: VLAYER_RETRY_ATTEMPTS,
                        excludeDomains: undefined,
                        headers: [
                            "Accept: application/json, text/event-stream",
                            "Content-Type: application/json"
                        ],
                        vlayerConfig: {
                            apiEndpoint: env.VLAYER_WEB_PROOF_API,
                            clientId: env.VLAYER_CLIENT_ID,
                            bearerToken: env.VLAYER_BEARER_TOKEN,
                        },
                    }));
                }
                
                return withProxy(targetUrl, hooks);
            };

            // Extract API key from various sources
            const apiKey = extractApiKey(original, currentUrl);

            let session = null;
            if (apiKey) {
                session = await auth.api.getSession({
                    headers: new Headers({
                        'x-api-key': apiKey,
                    }),
                });
            }

            if (!session) {
                session = await getSessionFromHeaders(original.headers);
            }

            if (session) {
                return withMcpProxy(session.session)(original);
            }

            if (disableMcpAuth) {
                return withMcpProxy(null)(original);
            }

            const handler = withMcpAuth(auth, (req, session) => {
                return withMcpProxy(session)(req);
            });

            return handler(original);
        }

        // MCP handler mode (not proxying)
        const handler = (session: unknown) => createMcpHandler(async (server) => {
            server.tool(
                "ping",
                "Health check that echoes an optional message",
                { message: z.string().optional() },
                async ({ message }) => {
                    return {
                        content: [
                            { type: "text", text: message ? `pong: ${message}` : "pong" },
                        ],
                    };
                }
            );

            server.tool(
                "me",
                "Returns the current authenticated user's basic info if available",
                {},
                async () => {
                    const session = await getSessionFromHeaders(original.headers);

                    if (!session) {
                        return { content: [{ type: "text", text: "Not authenticated" }] };
                    }
                    
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ...session.user }) },
                        ],
                    };
                }
            );
        });

        if (disableMcpAuth) {
            return handler(null)(c.req.raw);
        }

        return withMcpAuth(auth, (req, session) => handler(session)(req))(c.req.raw);
    });
}

