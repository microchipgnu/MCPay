import { TRUTHY_HEADER_VALUES } from "./constants.js";

/**
 * Check if a header value is truthy
 */
export function isTruthyHeader(value: string | null): boolean {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return TRUTHY_HEADER_VALUES.includes(normalized as typeof TRUTHY_HEADER_VALUES[number]);
}

/**
 * Extract API key from various sources (query params, headers)
 */
export function extractApiKey(req: Request, url: URL): string | null {
    const apiKeyFromQuery = url.searchParams.get("apiKey") || url.searchParams.get("api_key");
    const apiKeyFromXHeader = req.headers.get("x-api-key");
    return apiKeyFromQuery || apiKeyFromXHeader;
}

/**
 * Check if VLayer should be enabled based on header
 */
export function isVlayerEnabled(req: Request): boolean {
    const vlayerEnabledHeader = req.headers.get("x-vlayer-enabled");
    return vlayerEnabledHeader !== null && isTruthyHeader(vlayerEnabledHeader);
}

