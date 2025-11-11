import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Hook, RequestExtra, ToolCallResponseHookResult } from "mcpay/handler";
import { VLayer, WebProofResponse, VLayerConfig, ExecutedRequestWithProof } from "../../3rd-parties/vlayer/index.js";

export interface VLayerHookConfig {
  enabled?: boolean;
  logProofs?: boolean;
  attachToResponse?: boolean;
  validateProofs?: boolean;
  includeRequestDetails?: boolean;
  includeResponseDetails?: boolean;
  maxProofSize?: number;
  timeoutMs?: number;
  retryAttempts?: number;
  excludeDomains?: string[];
  includeDomains?: string[];
  targetUrl?: string;
  headers?: string[];
  vlayerConfig: VLayerConfig;
}

export class VLayerHook implements Hook {
  name = "vlayer";
  private config: VLayerHookConfig;
  private vlayer?: VLayer;
  private requestContext?: {
    originalRequest: CallToolRequest;
    extra: RequestExtra;
    targetUrl: string;
    generatedProof?: WebProofResponse;
  };

  constructor(config: VLayerHookConfig) {
    this.config = {
      enabled: true,
      logProofs: false,
      attachToResponse: true,
      validateProofs: true,
      includeRequestDetails: true,
      includeResponseDetails: true,
      maxProofSize: 1024 * 1024, // 1MB
      timeoutMs: 10000, // 10 seconds
      retryAttempts: 2,
      excludeDomains: [],
      includeDomains: [],
      headers: [],
      ...config,
    };

    // Check if VLayer credentials are provided
    const hasCredentials = config.vlayerConfig.clientId && config.vlayerConfig.bearerToken;
    if (!hasCredentials) {
      console.warn("[VLayerHook] VLayer credentials not provided. Disabling web proof generation.");
      this.config.enabled = false;
      return;
    }

    // Initialize VLayer instance with provided config
    this.vlayer = new VLayer(config.vlayerConfig);
    console.log("[VLayerHook] Initialized with config:", this.config);
  }

  async processCallToolRequest(req: CallToolRequest, extra: RequestExtra) {
    if (!this.config.enabled) {
      console.log("[VLayerHook] Disabled, skipping processCallToolRequest");
      return { resultType: "continue" as const, request: req };
    }

    try {
      // Extract target URL from extra context
      const targetUrl = this.config.targetUrl;
      console.log("[VLayerHook] Extracted targetUrl:", targetUrl);
      if (!targetUrl) {
        console.log("[VLayerHook] No target URL found, skipping web proof generation");
        return { resultType: "continue" as const, request: req };
      }

      // Check domain filters
      if (!this.shouldProcessDomain(targetUrl)) {
        console.log(`[VLayerHook] Domain ${targetUrl} filtered out, skipping web proof generation`);
        return { resultType: "continue" as const, request: req };
      }

      // Check if payment is present in the request - if so, generate proof BEFORE making the request
      const params = req.params && typeof req.params === 'object' ? req.params as Record<string, unknown> : null;
      const meta = params?._meta && typeof params._meta === 'object' ? params._meta as Record<string, unknown> : null;
      const hasPayment = meta && 'x402/payment' in meta;

      // Debug logging
      console.log("[VLayerHook] Checking for payment in request:", {
        hasParams: !!params,
        hasMeta: !!meta,
        metaKeys: meta ? Object.keys(meta) : [],
        hasPayment,
      });

      // Store request context
      this.requestContext = {
        originalRequest: req,
        extra,
        targetUrl,
      };

      // If payment is present, execute request through VLayer which returns both proof and response
      if (hasPayment) {
        console.log("[VLayerHook] Payment detected in request, executing through VLayer (single request)");
        try {
          const executed = await this.executeWithProofWithRetry(req, targetUrl, extra);
          if (executed) {
            // Validate proof if configured
            if (this.config.validateProofs && !VLayer.validateWebProof(executed.proof)) {
              console.warn("[VLayerHook] Generated web proof failed validation");
              // Still return the response even if proof validation fails
            }

            // Convert HTTP response from VLayer to CallToolResult format
            const callToolResult = this.convertHttpResponseToCallToolResult(executed.httpResponse);
            
            // Attach proof to the response
            const responseWithProof = this.attachProofToMeta(callToolResult, executed.proof);
            
            console.log("[VLayerHook] Request executed through VLayer, returning response with proof");
            return { resultType: "respond" as const, response: responseWithProof };
          }
        } catch (error) {
          console.error("[VLayerHook] Error executing request through VLayer:", error);
          // Fall through to continue with normal flow if VLayer execution fails
        }
      } else {
        console.log("[VLayerHook] No payment in request, will check response for payment requirement");
      }

      return { resultType: "continue" as const, request: req };
    } catch (error) {
      console.error("[VLayerHook] Error in processCallToolRequest:", error);
      return { resultType: "continue" as const, request: req };
    }
  }

  async processCallToolResult(res: CallToolResult, req: CallToolRequest, extra: RequestExtra): Promise<ToolCallResponseHookResult> {
    if (!this.config.enabled) {
      return { resultType: "continue" as const, response: res };
    }

    try {
      // Check if the original request had payment but proof wasn't generated
      // This handles the retry case where request hooks weren't called again
      const params = req.params && typeof req.params === 'object' ? req.params as Record<string, unknown> : null;
      const meta = params?._meta && typeof params._meta === 'object' ? params._meta as Record<string, unknown> : null;
      const hasPaymentInRequest = meta && 'x402/payment' in meta;
      
      const responseMeta = res._meta && typeof res._meta === 'object' ? res._meta as Record<string, unknown> : null;
      const hasProof = responseMeta && 'vlayer/proof' in responseMeta;
      const hasPaymentResponse = responseMeta && 'x402/payment-response' in responseMeta;

      // If request had payment but response doesn't have proof, this was likely a retry
      // that bypassed processCallToolRequest. Execute through VLayer now.
      if (hasPaymentInRequest && !hasProof && hasPaymentResponse) {
        console.log("[VLayerHook] Payment detected in request but no proof found - likely retry. Executing through VLayer now.");
        const targetUrl = this.config.targetUrl || extra.targetUrl;
        if (targetUrl && this.shouldProcessDomain(targetUrl)) {
          try {
            const executed = await this.executeWithProofWithRetry(req, targetUrl, extra);
            if (executed) {
              // Validate proof if configured
              if (this.config.validateProofs && !VLayer.validateWebProof(executed.proof)) {
                console.warn("[VLayerHook] Generated web proof failed validation");
              }

              // Merge the VLayer response with the existing response (preserve payment-response)
              const vlayerResult = this.convertHttpResponseToCallToolResult(executed.httpResponse);
              const mergedResponse: CallToolResult = {
                ...vlayerResult,
                _meta: {
                  ...(vlayerResult._meta || {}),
                  ...(res._meta || {}), // Preserve existing meta including payment-response
                }
              };
              
              // Attach proof to the merged response
              const responseWithProof = this.attachProofToMeta(mergedResponse, executed.proof);
              
              console.log("[VLayerHook] Request executed through VLayer on retry, returning response with proof");
              this.requestContext = undefined;
              return { resultType: "continue" as const, response: responseWithProof };
            }
          } catch (error) {
            console.error("[VLayerHook] Error executing request through VLayer in processCallToolResult:", error);
            // Fall through to continue with normal flow
          }
        }
      }

      // Check if there's a payment requirement (but no payment response)
      // This handles the case where payment requirement comes from upstream
      const hasPaymentError = responseMeta && 'x402/error' in responseMeta;
      const paymentError = hasPaymentError ? responseMeta['x402/error'] as { error?: string } | undefined : null;
      const isPaymentRequired = paymentError?.error?.toLowerCase() === 'payment_required';

      // If there's a payment requirement but no response, we'll generate proof on the retry (when payment is added)
      if (isPaymentRequired && !hasPaymentResponse) {
        console.log("[VLayerHook] Payment requirement detected, proof will be generated on retry with payment");
        this.requestContext = undefined;
        return { resultType: "continue" as const, response: res };
      }

      // If payment was already processed and proof exists, we're good
      if (hasPaymentResponse && hasProof) {
        console.log("[VLayerHook] Payment processed and proof already attached");
        this.requestContext = undefined;
        return { resultType: "continue" as const, response: res };
      }

      // If payment was already processed but no proof, try to generate it (retry case)
      if (hasPaymentResponse && !hasProof) {
        console.log("[VLayerHook] Payment processed but no proof found - attempting to generate proof");
        // This case is handled above, so we'll just continue
      }

      // No payment requirement, no proof needed
      console.log("[VLayerHook] No payment requirement found, skipping web proof generation");
      this.requestContext = undefined;
      return { resultType: "continue" as const, response: res };
    } catch (error) {
      console.error("[VLayerHook] Error in processCallToolResult:", error);
      this.requestContext = undefined;
      return { resultType: "continue" as const, response: res };
    }
  }

  private async executeWithProofWithRetry(req: CallToolRequest, targetUrl: string, extra: RequestExtra): Promise<ExecutedRequestWithProof | null> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        console.log(`[VLayerHook] executeWithProofWithRetry attempt ${attempt + 1} for targetUrl ${targetUrl}`);
        const executed = await this.executeWithProof(req, targetUrl, extra);
        if (executed) {
          console.log("[VLayerHook] Request executed through VLayer successfully on attempt", attempt + 1);
          return executed;
        } else {
          console.warn(`[VLayerHook] VLayer execution returned null on attempt ${attempt + 1}`);
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`[VLayerHook] Attempt ${attempt + 1} failed:`, error);

        if (attempt < this.config.retryAttempts!) {
          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[VLayerHook] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    console.error("[VLayerHook] All retry attempts failed:", lastError);
    return null;
  }

  private async executeWithProof(req: CallToolRequest, targetUrl: string, extra: RequestExtra): Promise<ExecutedRequestWithProof | null> {
    if (!this.vlayer) {
      console.warn("[VLayerHook] VLayer instance not available, skipping request execution");
      return null;
    }

    try {
      // Use headers from config
      const headers = this.config.headers || [];
      console.log("[VLayerHook] Executing request through VLayer with headers:", headers, "targetUrl:", targetUrl);

      // Extract request body - reconstruct JSON-RPC 2.0 format
      // The endpoint expects JSON-RPC 2.0, not raw MCP params
      let body: string | undefined;
      if (req.params && typeof req.params === 'object') {
        try {
          // Reconstruct JSON-RPC 2.0 format that the endpoint expects
          // Use toolCallId as the JSON-RPC id, or generate one if not available
          const rpcId = (req.params as any)?.toolCallId || crypto.randomUUID();
          const jsonRpcBody = {
            jsonrpc: "2.0",
            method: "tools/call",
            id: rpcId,
            params: req.params
          };
          body = JSON.stringify(jsonRpcBody);
        } catch (jsonErr) {
          console.warn("[VLayerHook] Could not stringify request params for VLayer request body. Error:", jsonErr);
        }
      }

      // Check body size limit
      if (body && body.length > this.config.maxProofSize!) {
        console.warn(`[VLayerHook] Request body too large (${body.length} bytes), truncating`);
        body = body.substring(0, this.config.maxProofSize!);
      }

      // Execute request through VLayer with timeout
      const webProofRequest = {
        url: targetUrl,
        method: 'POST' as const,
        headers,
        body,
      };

      console.log("[VLayerHook] Calling vlayer.executeWithProof with request:", webProofRequest);

      const executePromise = this.vlayer.executeWithProof(webProofRequest);
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error("[VLayerHook] VLayer execution timed out after", this.config.timeoutMs, "ms");
          reject(new Error('VLayer execution timeout'))
        }, this.config.timeoutMs);
      });

      try {
        const result = await Promise.race([executePromise, timeoutPromise]);
        clearTimeout(timeoutId!);
        console.log("[VLayerHook] VLayer execution result received");
        return result;
      } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
      }
    } catch (error) {
      console.error("[VLayerHook] Failed to execute request through VLayer:", error);
      return null;
    }
  }

  private convertHttpResponseToCallToolResult(httpResponse: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  }): CallToolResult {
    // Parse the HTTP response body - it should be a JSON-RPC response
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(httpResponse.body);
    } catch (error) {
      console.warn("[VLayerHook] Failed to parse HTTP response body as JSON:", error);
      // Return error result if body is not valid JSON
      return {
        content: [
          { type: "text", text: `Invalid response format: ${httpResponse.body}` }
        ],
        isError: true,
      };
    }

    // Check if it's a JSON-RPC response with a result field
    if (parsedBody && typeof parsedBody === 'object' && 'result' in parsedBody) {
      const rpcResponse = parsedBody as { result?: unknown };
      // The result should be a CallToolResult
      if (rpcResponse.result && typeof rpcResponse.result === 'object') {
        return rpcResponse.result as CallToolResult;
      }
    }

    // If it's already a CallToolResult-like structure, return it
    if (parsedBody && typeof parsedBody === 'object' && ('content' in parsedBody || 'isError' in parsedBody)) {
      return parsedBody as CallToolResult;
    }

    // Fallback: wrap the response body as text content
    return {
      content: [
        { type: "text", text: httpResponse.body }
      ],
      isError: httpResponse.status >= 400,
    };
  }
  
  private shouldProcessDomain(targetUrl: string): boolean {
    try {
      const url = new URL(targetUrl);
      const domain = url.hostname;
      console.log("[VLayerHook] shouldProcessDomain for domain:", domain);

      // Check exclude domains first
      if (this.config.excludeDomains?.length) {
        for (const excludeDomain of this.config.excludeDomains) {
          if (domain.includes(excludeDomain)) {
            console.log(`[VLayerHook] Domain ${domain} is in the exclude list (${excludeDomain})`);
            return false;
          }
        }
      }

      // Check include domains if specified
      if (this.config.includeDomains?.length) {
        for (const includeDomain of this.config.includeDomains) {
          if (domain.includes(includeDomain)) {
            console.log(`[VLayerHook] Domain ${domain} is in the include list (${includeDomain})`);
            return true;
          }
        }
        console.log(`[VLayerHook] Include domains specified but none matched for domain ${domain}`);
        return false; // If include domains are specified but none match
      }

      console.log(`[VLayerHook] No domain filters blocked ${domain}. Processing request.`);
      return true; // Default to processing if no filters match
    } catch (e) {
      console.warn("[VLayerHook] Error in shouldProcessDomain, likely invalid targetUrl:", targetUrl, "Error:", e);
      return false; // Invalid URL
    }
  }

  private attachProofToMeta(res: CallToolResult, webProof: WebProofResponse): CallToolResult {
    // Attach proof to _meta field instead of polluting content
    const enhancedMeta = {
      ...(res._meta || {}),
      'vlayer/proof': {
        success: webProof.success,
        data: webProof.data,
        version: webProof.version,
        meta: webProof.meta,
        generatedAt: new Date().toISOString(),
        valid: VLayer.validateWebProof(webProof),
      }
    };

    console.log("[VLayerHook] Proof attached to _meta['vlayer/proof']");

    return {
      ...res,
      _meta: enhancedMeta,
    };
  }
}
