import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Hook, RequestExtra, ToolCallResponseHookResult } from "mcpay/handler";
import { PaymentRequirements } from "x402/types";
import { attemptSignPayment } from "../../3rd-parties/payment-strategies/index.js";
import { createOneClickBuyUrl } from "../../3rd-parties/cdp/onramp/index.js";


type X402ErrorPayload = {
    x402Version?: number;
    error?: string;
    accepts?: Array<{
        scheme: string;
        network: string;
        maxAmountRequired: string;
        payTo?: string;
        asset: string;
        maxTimeoutSeconds?: number;
        resource?: string;
        mimeType?: string;
        description?: string;
        extra?: Record<string, unknown>;
    }>;
};

function isPaymentRequired(res: any): X402ErrorPayload | null {
    const meta = (res?._meta as Record<string, unknown> | undefined) ?? null;
    if (!meta) return null;
    const payload = meta["x402/error"] as X402ErrorPayload | undefined;
    if (!payload) return null;
    if (!payload.error) return null;
    // Treat any pricing-related error as an opportunity to auto-pay
    // Normalize error codes to lowercase for consistent validation
    const normalizedError = payload.error.toLowerCase();
    const codes = new Set(["payment_required", "invalid_payment", "unable_to_match_payment_requirements", "price_compute_failed", "insufficient_funds"]);
    return codes.has(normalizedError) ? payload : null;
}

export class X402WalletHook implements Hook {
    name = "x402-wallet";
    session: any;
    constructor(session: any) {
        this.session = session;
    }

    async processCallToolRequest(req: CallToolRequest, _extra: RequestExtra) {
        return { resultType: "continue" as const, request: req };
    }

    async processCallToolResult(res: CallToolResult, req: CallToolRequest, extra: RequestExtra): Promise<ToolCallResponseHookResult> {
        try {
            console.log("[X402WalletHook] processCallToolResult called");
            const payload = isPaymentRequired(res);
            if (!payload) {
                console.log("[X402WalletHook] No payment required, continuing.");
                return { resultType: "continue" as const, response: res };
            }

            // Handle insufficient_funds error by providing funding links
            // Normalize error code to lowercase for consistent comparison
            if (payload.error && payload.error.toLowerCase() === "insufficient_funds") {
                console.log("[X402WalletHook] Insufficient funds detected, providing funding links.");
                return this.handleInsufficientFunds(res, payload, req, extra);
            }

            // Must have an authenticated user to auto-pay
            const session = this.session;

            console.log("[X402WalletHook] Session:", JSON.stringify(session, null, 2));
            console.log("[X402WalletHook] Extra:", JSON.stringify(extra, null, 2));
            if (!session?.userId) {
                console.log("[X402WalletHook] No authenticated user found, cannot auto-pay.");
                return { resultType: "continue" as const, response: res };
            }

            const first = Array.isArray(payload.accepts) && payload.accepts.length > 0 ? payload.accepts[0] : null;
            if (!first) {
                console.log("[X402WalletHook] No acceptable payment option found in payload, continuing.");
                return { resultType: "continue" as const, response: res };
            }

            const toolName = String((req?.params as unknown as { name?: string })?.name ?? "");

            const user = {
                id: String(session.userId),
            } as const;


            const result = await attemptSignPayment(first as unknown as PaymentRequirements, user);
            if (!result.success || !result.signedPaymentHeader) {
                console.log("[X402WalletHook] Auto-sign failed or no signedPaymentHeader returned. Result:", result);
                return { resultType: "continue" as const, response: res };
            }

            // Ask proxy to retry with x402/payment token
            const originalParams = (req?.params ?? {}) as Record<string, unknown>;
            const originalMeta = (originalParams["_meta"] as Record<string, unknown> | undefined) ?? {};
            const inferredName = typeof (originalParams)?.name === "string" ? String((originalParams).name) : toolName;
            const nextMeta = { ...originalMeta, ["x402/payment"]: result.signedPaymentHeader } as Record<string, unknown>;
            const nextParams = { ...originalParams, name: inferredName, _meta: nextMeta } as Record<string, unknown>;
            const nextRequest = { method: "tools/call" as const, params: nextParams } as CallToolRequest;

            console.log("[X402WalletHook] Auto-sign succeeded, retrying with signed payment header.");

            return { resultType: "retry" as const, request: nextRequest };
        } catch (err) {
            console.error("[X402WalletHook] Error in processCallToolResult:", err);
            return { resultType: "continue" as const, response: res };
        }
    }

    private async handleInsufficientFunds(res: CallToolResult, payload: X402ErrorPayload, req: CallToolRequest, extra: RequestExtra): Promise<ToolCallResponseHookResult> {
        try {
            // Extract payer address from payload
            const payerAddress = (payload as any).payer as string | undefined;
            
            // Build funding message in markdown format
            let fundingMessage = `## Funding Required\n\nTo fund your account:\n\n• **Wallet Management**: Visit [mcpay.tech/#account-wallet](https://mcpay.tech/#account-wallet) to manage your wallet`;
            
            // Generate onramp URL if we have a payer address and session
            if (payerAddress && this.session?.userId) {
                try {
                    const onrampUrl = await this.generateOnrampUrl(payerAddress, payload.accepts || []);
                    if (onrampUrl) {
                        fundingMessage += `\n• **Quick Funding**: [Fund with Coinbase](${onrampUrl})`;
                    }
                } catch (error) {
                    console.warn("[X402WalletHook] Failed to generate onramp URL:", error);
                }
            }
            
            fundingMessage += `\n• **Balance Check**: Ensure you have sufficient balance for the required payment\n\n---\n\n## Payment Details`;
            
            // Create enhanced response with funding information placed before error details
            const enhancedContent = Array.isArray(res.content) ? [...res.content] : [];
            // Insert funding message at the beginning
            enhancedContent.unshift({ type: "text", text: fundingMessage });
            
            const enhancedResponse: CallToolResult = {
                ...res,
                content: enhancedContent
            };
            
            return { resultType: "continue" as const, response: enhancedResponse };
        } catch (error) {
            console.error("[X402WalletHook] Error in handleInsufficientFunds:", error);
            return { resultType: "continue" as const, response: res };
        }
    }

    private async generateOnrampUrl(payerAddress: string, accepts: X402ErrorPayload["accepts"]): Promise<string | null> {
        try {
            // Find the first supported network requirement for onramp (EVM or Solana)
            const supportedRequirement = accepts?.find(req => 
                req.network && 
                (req.network.includes('base') || req.network.includes('ethereum') || req.network.includes('polygon') || req.network.includes('avalanche') || req.network.includes('solana')) &&
                req.scheme === "exact"
            );
            
            if (!supportedRequirement) return null;
            
            // Extract network name (remove testnet suffixes for onramp)
            const network = supportedRequirement.network.replace(/-sepolia|-fuji|-amoy|-testnet|-devnet/g, '');
            
            // Extract asset address
            const assetAddress = supportedRequirement.asset;
            
            // Determine asset symbol
            let assetSymbol = 'USDC'; // Default to USDC
            if (assetAddress && supportedRequirement.extra?.name) {
                assetSymbol = String(supportedRequirement.extra.name);
            } else if (supportedRequirement.network.includes('solana')) {
                // For Solana, default to SOL if no specific asset is specified
                assetSymbol = 'USDC';
            }
            
            // Generate onramp URL directly using the internal function
            const url = await createOneClickBuyUrl(payerAddress, {
                network: network,
                asset: assetSymbol,
                amount: 20, // Default $20
                currency: 'USD',
                userId: this.session?.userId
            });
            
            return url;
        } catch (error) {
            console.warn("[X402WalletHook] Error generating onramp URL:", error);
            return null;
        }
    }
}

