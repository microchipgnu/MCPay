import type { Context } from "hono";
import { auth } from "../auth.js";

export interface AuthenticatedContext {
    session: Awaited<ReturnType<typeof auth.api.getSession>>;
    user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"];
}

/**
 * Get authenticated session from request headers
 */
export async function getSessionFromHeaders(headers: Headers) {
    return await auth.api.getSession({ headers });
}

/**
 * Require authentication for a route handler
 * Returns the authenticated session or null
 */
export async function requireAuth(c: Context): Promise<AuthenticatedContext | null> {
    const session = await getSessionFromHeaders(c.req.raw.headers);
    if (!session) {
        return null;
    }
    return { session, user: session.user };
}

/**
 * Handle API errors consistently
 */
export function handleError(error: unknown): { error: string } {
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: "An unexpected error occurred" };
}

