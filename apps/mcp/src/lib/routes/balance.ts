import type { Hono } from "hono";
import { requireAuth, handleError } from "../utils/auth-helpers.js";
import { db } from "../auth.js";
import { getBalancesSummary } from "../balance-tracker.js";
import { isNetworkSupported, type UnifiedNetwork } from "../3rd-parties/cdp/wallet/networks.js";
import { DEFAULT_NETWORK } from "../utils/constants.js";

interface NativeBalance {
    address: string;
    network: string;
    chainId: number;
    nativeSymbol: string;
    balanceWei: string;
    balanceFormatted: string;
    decimals: number;
}

interface TokenBalance {
    address: string;
    network: string;
    chainId: number;
    tokenAddress: string;
    tokenSymbol: string;
    tokenName: string;
    decimals: number;
    balance: string;
    balanceFormatted: string;
}

function serializeNative(n: unknown): NativeBalance | null {
    if (!n || typeof n !== "object") return null;
    const native = n as Record<string, unknown>;
    return {
        address: String(native.address ?? ""),
        network: String(native.network ?? ""),
        chainId: Number(native.chainId ?? 0),
        nativeSymbol: String(native.nativeSymbol ?? ""),
        balanceWei: String(native.balanceWei ?? "0"),
        balanceFormatted: String(native.balanceFormatted ?? "0"),
        decimals: Number(native.decimals ?? 18),
    };
}

function serializeToken(t: unknown): TokenBalance | null {
    if (!t || typeof t !== "object") return null;
    const token = t as Record<string, unknown>;
    return {
        address: String(token.address ?? ""),
        network: String(token.network ?? ""),
        chainId: Number(token.chainId ?? 0),
        tokenAddress: String(token.tokenAddress ?? ""),
        tokenSymbol: String(token.tokenSymbol ?? ""),
        tokenName: String(token.tokenName ?? ""),
        decimals: Number(token.decimals ?? 18),
        balance: String(token.balance ?? "0"),
        balanceFormatted: String(token.balanceFormatted ?? "0"),
    };
}

export function registerBalanceRoutes(app: Hono) {
    // Preflight
    app.options("/api/balance", (c) => {
        return c.body(null, 204);
    });

    // Get current user's primary wallet balance (or specified wallet)
    app.get("/api/balance", async (c) => {
        try {
            const authContext = await requireAuth(c);
            if (!authContext) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const queryWallet = c.req.query("walletAddress")?.trim();
            const queryNetwork = c.req.query("network")?.trim();

            let walletAddress = queryWallet || "";
            let network: UnifiedNetwork | undefined = undefined;

            if (queryNetwork && isNetworkSupported(queryNetwork)) {
                network = queryNetwork as UnifiedNetwork;
            }

            if (!walletAddress) {
                const wallets = await db.query.userWallets.findMany({
                    where: (t, { and, eq }) => and(eq(t.userId, authContext.user.id), eq(t.isActive, true)),
                    orderBy: (t, { desc }) => [desc(t.isPrimary), desc(t.createdAt)],
                });
                
                if (!wallets || wallets.length === 0) {
                    return c.json({ error: "No wallets found for user" }, 404);
                }
                
                const primary = wallets.find((w) => w.isPrimary) || wallets[0];
                walletAddress = primary.walletAddress;
                
                if (!network && typeof primary.blockchain === "string" && isNetworkSupported(primary.blockchain)) {
                    network = primary.blockchain as UnifiedNetwork;
                }
            }

            // Fallback default network if not provided/derived
            if (!network) {
                network = DEFAULT_NETWORK;
            }

            const summary = await getBalancesSummary(walletAddress as `0x${string}`, network);

            return c.json({
                walletAddress,
                network,
                native: serializeNative(summary.native),
                usdc: serializeToken(summary.usdc),
            });
        } catch (error) {
            return c.json(handleError(error), 400);
        }
    });
}

