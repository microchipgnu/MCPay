import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Hook, RequestExtra, ToolCallResponseHookResult } from "mcpay/handler";
import { VLayer, WebProofResponse, VLayerConfig } from "../../3rd-parties/vlayer/index.js";
import { extractWebProofData, parseWebProofHex } from "../../3rd-parties/vlayer/webproof-parser.js";

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

      // Store request context for later use
      this.requestContext = {
        originalRequest: req,
        extra,
        targetUrl,
      };

      console.log("[VLayerHook] Stored request context for web proof generation. RequestContext:", this.requestContext);
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
      // Generate web proof for the actual external request that was made
      console.log("[VLayerHook] Attempting to generate web proof with context:", this.requestContext);

      const webProof = await this.generateWebProofWithRetry(
        req,
        this.config.targetUrl!,
        extra
      );

      if (webProof) {
        console.log("[VLayerHook] Web proof generated:", webProof);

        // Validate proof if configured
        if (this.config.validateProofs && !VLayer.validateWebProof(webProof)) {
          console.warn("[VLayerHook] Generated web proof failed validation");
          return { resultType: "continue" as const, response: res };
        }

        if (this.config.logProofs) {
          console.log("[VLayerHook] Generated web proof details:", {
            presentationLength: webProof.presentation?.length || 0,
            isValid: VLayer.validateWebProof(webProof),
          });
        }

        // Parse the proof to extract useful data
        const parsedProof = this.parseWebProof(webProof);

        if (parsedProof) {
          console.log("[VLayerHook] Parsed proof data:", {
            url: parsedProof.url,
            requestMethod: parsedProof.request?.method,
            responseStatus: parsedProof.response?.statusCode,
            hasResponseBody: !!parsedProof.response?.bodyJson,
            requestHeaders: parsedProof.request?.headers,
            responseHeaders: parsedProof.response?.headers,
          });
        } else {
          console.warn("[VLayerHook] Unable to parse proof data from webProof");
        }

        // Attach proof to response if configured
        if (this.config.attachToResponse) {
          console.log("[VLayerHook] Attaching proof to response.");
          const enhancedResponse = this.attachProofToResponse(res, webProof, parsedProof);
          this.requestContext = undefined;
          return { resultType: "continue" as const, response: enhancedResponse };
        }
      } else {
        console.warn("[VLayerHook] No webProof generated.");
      }

      // Clear request context
      this.requestContext = undefined;
      return { resultType: "continue" as const, response: res };
    } catch (error) {
      console.error("[VLayerHook] Error generating web proof:", error);
      this.requestContext = undefined;
      return { resultType: "continue" as const, response: res };
    }
  }

  private async generateWebProofWithRetry(req: CallToolRequest, targetUrl: string, extra: RequestExtra): Promise<WebProofResponse | null> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        console.log(`[VLayerHook] generateWebProofWithRetry attempt ${attempt + 1} for targetUrl ${targetUrl}`);
        const webProof = await this.generateWebProof(req, targetUrl, extra);
        if (webProof) {
          console.log("[VLayerHook] Web proof generated successfully on attempt", attempt + 1);
          return webProof;
        } else {
          console.warn(`[VLayerHook] Web proof generation returned null on attempt ${attempt + 1}`);
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

  private async generateWebProof(req: CallToolRequest, targetUrl: string, extra: RequestExtra): Promise<WebProofResponse | null> {
    if (!this.vlayer) {
      console.warn("[VLayerHook] VLayer instance not available, skipping web proof generation");
      return null;
    }

    try {
      // Use headers from config
      const headers = this.config.headers || [];
      console.log("[VLayerHook] Generating web proof with headers:", headers, "targetUrl:", targetUrl);

      // Extract request body
      let body: string | undefined;
      if (req.params && typeof req.params === 'object') {
        try {
          body = JSON.stringify(req.params);
        } catch (jsonErr) {
          console.warn("[VLayerHook] Could not stringify request params for web proof request body. Error:", jsonErr);
        }
      }

      // Check body size limit
      if (body && body.length > this.config.maxProofSize!) {
        console.warn(`[VLayerHook] Request body too large (${body.length} bytes), truncating`);
        body = body.substring(0, this.config.maxProofSize!);
      }

      // Generate web proof with timeout
      const webProofRequest = {
        url: targetUrl,
        method: 'POST' as const,
        headers,
        body,
      };

      console.log("[VLayerHook] Calling vlayer.generateWebProof with request:", webProofRequest);

      const proofPromise = this.vlayer.generateWebProof(webProofRequest);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error("[VLayerHook] Web proof generation timed out after", this.config.timeoutMs, "ms");
          reject(new Error('Web proof generation timeout'))
        }, this.config.timeoutMs);
      });

      const result = await Promise.race([proofPromise, timeoutPromise]);
      console.log("[VLayerHook] Web proof result:", result);
      return result;
    } catch (error) {
      console.error("[VLayerHook] Failed to generate web proof:", error);
      return null;
    }
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

  private parseWebProof(webProof: WebProofResponse) {
    try {
      // Try to extract hex proof from presentation
      const presentation = JSON.parse(webProof.presentation);
      const hexProof = presentation.presentationJson || presentation;

      if (typeof hexProof === 'string' && /^[0-9a-fA-F]+$/.test(hexProof)) {
        console.log("[VLayerHook] Parsing web proof as hex string.");
        return parseWebProofHex(hexProof);
      }

      // Fallback to extractWebProofData
      console.log("[VLayerHook] Fallback to extractWebProofData for presentation.");
      return extractWebProofData(new Response(), webProof.presentation);
    } catch (error) {
      console.warn("[VLayerHook] Failed to parse web proof:", error);
      return null;
    }
  }

  private attachProofToResponse(res: CallToolResult, webProof: WebProofResponse, parsedProof?: any): CallToolResult {
    // Add proof metadata to the response
    const enhancedContent = Array.isArray(res.content) ? [...res.content] : [];

    // Build proof information text
    let proofText = `\n\n---\n**🔒 Web Proof Generated**\n\nA cryptographic web proof has been generated for this request.\n\n`;

    if (this.config.includeRequestDetails && parsedProof?.request) {
      proofText += `**Request Details:**\n`;
      proofText += `- URL: ${parsedProof.request.url}\n`;
      proofText += `- Method: ${parsedProof.request.method}\n`;
      if (parsedProof.request.headers && Object.keys(parsedProof.request.headers).length > 0) {
        proofText += `- Headers: ${Object.keys(parsedProof.request.headers).length} headers\n`;
      }
      proofText += `\n`;
    }

    if (this.config.includeResponseDetails && parsedProof?.response) {
      proofText += `**Response Details:**\n`;
      proofText += `- Status: ${parsedProof.response.statusCode} ${parsedProof.response.statusText}\n`;
      if (parsedProof.response.headers && Object.keys(parsedProof.response.headers).length > 0) {
        proofText += `- Headers: ${Object.keys(parsedProof.response.headers).length} headers\n`;
      }
      if (parsedProof.response.bodyJson) {
        proofText += `- Body: JSON response (${JSON.stringify(parsedProof.response.bodyJson).length} chars)\n`;
      }
      proofText += `\n`;
    }

    proofText += `**Proof Information:**\n`;
    proofText += `- Presentation Length: ${webProof.presentation?.length || 0} characters\n`;
    proofText += `- Valid: ${VLayer.validateWebProof(webProof) ? '✅' : '❌'}\n`;
    proofText += `- Generated: ${new Date().toISOString()}\n\n`;

    proofText += `This proof can be used to verify the authenticity and integrity of the request and response.`;

    // Add proof information as a text element
    const proofInfo = {
      type: "text" as const,
      text: proofText
    };

    enhancedContent.push(proofInfo);

    console.log("[VLayerHook] Proof text attached to response:", proofText);

    return {
      ...res,
      content: enhancedContent,
    };
  }
}
