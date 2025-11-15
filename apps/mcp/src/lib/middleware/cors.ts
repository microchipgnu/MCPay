import { cors } from "hono/cors";
import { getTrustedOrigins, isDevelopment } from "../../env.js";

const DEFAULT_DEV_ORIGINS = [
    "http://localhost:*",
    "http://127.0.0.1:3000",
    "http://localhost:3005",
    "http://127.0.0.1:3005",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:6274"
];

export function createCorsMiddleware() {
    const TRUSTED_ORIGINS = getTrustedOrigins();
    const isDev = isDevelopment();
    const ALLOWED_ORIGINS = new Set([
        ...(isDev ? DEFAULT_DEV_ORIGINS : []),
        ...TRUSTED_ORIGINS,
    ]);

    return cors({
        allowHeaders: [
            "Origin",
            "Content-Type",
            "Authorization",
            "WWW-Authenticate",
            "x-api-key",
            "X-Wallet-Type",
            "X-Wallet-Address",
            "X-Wallet-Provider",
            "x-vlayer-enabled"
        ],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        origin: (origin) => {
            if (!origin) return "";
            if (ALLOWED_ORIGINS.has(origin)) return origin;
            if (isDev) {
                try {
                    const url = new URL(origin);
                    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
                        return origin;
                    }
                } catch {
                    // Invalid URL, reject
                }
            }
            return "";
        },
        exposeHeaders: ["WWW-Authenticate"],
    });
}

