/**
 * Verification Layer (VLayer) for MCPay
 * 
 * This module provides web proof generation functionality for MCP servers
 * using the VLayer web prover service.
 */

import { parseWebProofHex } from "./webproof-parser.js";

export interface WebProofRequest {
  url: string;
  method: 'GET' | 'POST';
  headers: string[];
  body?: string;
}

export interface WebProofResponse {
  success: boolean;
  data: string;
  version: string;
  meta: {
    notaryUrl: string;
  };
  // Legacy format support - presentation field (deprecated)
  presentation?: string;
}

export interface ProofedRequest {
  request: Request;
  proof?: WebProofResponse;
}

export interface ProofedResponse {
  response: Response;
  proof?: WebProofResponse;
}

export interface ExecutedRequestWithProof {
  proof: WebProofResponse;
  httpResponse: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  };
}
  
export interface VLayerConfig {
  apiEndpoint: string;
  clientId: string;
  bearerToken: string;
}

export class VLayer {
  private readonly apiEndpoint: string;
  private readonly clientId: string;
  private readonly bearerToken: string;

  constructor(config: VLayerConfig) {
    this.apiEndpoint = config.apiEndpoint;
    this.clientId = config.clientId;
    this.bearerToken = config.bearerToken;
  }

  /**
   * Generates a cryptographic web proof for a given URL request
   */
  async generateWebProof(request: WebProofRequest): Promise<WebProofResponse> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Web proof generation failed: ${response.status} ${response.statusText}`);
      }

      const apiResponse = await response.json() as {
        success: boolean;
        data?: string;
        version?: string;
        meta?: { notaryUrl: string };
        error?: { code: string; message: string };
      };

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(`Web proof generation failed: ${apiResponse.error?.message || 'Unknown error'}`);
      }

      // Transform API response to WebProofResponse format
      const webProof: WebProofResponse = {
        success: apiResponse.success,
        data: apiResponse.data,
        version: apiResponse.version || '0.1.0-alpha.12',
        meta: apiResponse.meta || { notaryUrl: '' },
        // For backward compatibility, create presentation field
        presentation: JSON.stringify({
          presentationJson: apiResponse.data,
          version: apiResponse.version,
          meta: apiResponse.meta
        })
      };

      return webProof;
    } catch (error) {
      console.error('Error generating web proof:', error);
      throw error;
    }
  }


  /**
   * Executes a request through VLayer API and returns both proof and HTTP response
   * This method makes a single request to VLayer which executes the target request
   * and returns both the cryptographic proof and the HTTP response.
   */
  async executeWithProof(request: WebProofRequest): Promise<ExecutedRequestWithProof> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`VLayer execution failed: ${response.status} ${response.statusText}`);
      }

      const apiResponse = await response.json() as {
        success: boolean;
        data?: string;
        version?: string;
        meta?: { notaryUrl: string };
        error?: { code: string; message: string };
      };

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(`VLayer execution failed: ${apiResponse.error?.message || 'Unknown error'}`);
      }

      // Parse the proof hex data to extract HTTP response
      let parsedProof: ReturnType<typeof parseWebProofHex>;
      try {
        parsedProof = parseWebProofHex(apiResponse.data);
      } catch (parseError) {
        throw new Error(`Failed to parse VLayer proof data: ${(parseError as Error).message}`);
      }

      // Extract HTTP response from parsed proof
      if (!parsedProof.response) {
        throw new Error('VLayer proof data does not contain HTTP response');
      }

      const httpResponse = {
        status: parsedProof.response.statusCode,
        statusText: parsedProof.response.statusText,
        headers: parsedProof.response.headers,
        body: parsedProof.response.bodyText || (parsedProof.response.bodyJson ? JSON.stringify(parsedProof.response.bodyJson) : ''),
      };

      // Transform API response to ExecutedRequestWithProof format
      const webProof: WebProofResponse = {
        success: apiResponse.success,
        data: apiResponse.data,
        version: apiResponse.version || '0.1.0-alpha.12',
        meta: apiResponse.meta || { notaryUrl: '' },
        // For backward compatibility, create presentation field
        presentation: JSON.stringify({
          presentationJson: apiResponse.data,
          version: apiResponse.version,
          meta: apiResponse.meta
        })
      };

      return {
        proof: webProof,
        httpResponse,
      };
    } catch (error) {
      console.error('Error executing request with proof:', error);
      throw error;
    }
  }

  /**
   * Creates a fetch wrapper that generates web proofs for requests and responses
   */
  createFetchWrapper(originalFetch: typeof fetch = fetch) {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<ProofedResponse> => {
      // Create the request
      const request = new Request(input, init);
      
      // Convert headers to string array format expected by VLayer
      const headers: string[] = [];
      request.headers.forEach((value, key) => {
        headers.push(`${key}: ${value}`);
      });

      // Get request body if present
      let body: string | undefined;
      if (request.body) {
        try {
          const clonedRequest = request.clone();
          body = await clonedRequest.text();
        } catch (error) {
          console.warn('Could not read request body for proof generation:', error);
        }
      }

      // Generate web proof for the request
      let proof: WebProofResponse | undefined;
      try {
        const webProofRequest: WebProofRequest = {
          url: request.url,
          method: request.method as 'GET' | 'POST',
          headers,
          body,
        };
        proof = await this.generateWebProof(webProofRequest);
      } catch (error) {
        console.warn('Failed to generate web proof:', error);
      }

      // Execute the original fetch
      const response = await originalFetch(request);

      return {
        response,
        proof,
      };
    };
  }


  /**
   * Validates a web proof presentation
   */
  static validateWebProof(webProof: WebProofResponse): boolean {
    try {
      // New format: check for data, version, and meta fields
      if (webProof.success && webProof.data && webProof.version && webProof.meta) {
        // Validate data is a hex string
        if (typeof webProof.data === 'string' && /^[0-9a-fA-F]+$/.test(webProof.data)) {
          return true;
        }
      }
      
      // Legacy format: check presentation field
      if (webProof.presentation && typeof webProof.presentation === 'string') {
        try {
          const parsed = JSON.parse(webProof.presentation);
          return !!(parsed.presentationJson && parsed.meta && parsed.version);
        } catch {
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error validating web proof:', error);
      return false;
    }
  }
}
  