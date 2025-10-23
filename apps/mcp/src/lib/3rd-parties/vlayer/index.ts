/**
 * Verification Layer (VLayer) for MCPay
 * 
 * This module provides web proof generation functionality for MCP servers
 * using the VLayer web prover service.
 */

export interface WebProofRequest {
  url: string;
  method: 'GET' | 'POST';
  headers: string[];
  body?: string;
}

export interface WebProofResponse {
  presentation: string;
}

export interface ProofedRequest {
  request: Request;
  proof?: WebProofResponse;
}

export interface ProofedResponse {
  response: Response;
  proof?: WebProofResponse;
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

      const data = await response.json() as WebProofResponse;
      return data;
    } catch (error) {
      console.error('Error generating web proof:', error);
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
      if (!webProof.presentation || typeof webProof.presentation !== 'string') {
        return false;
      }
      
      // Parse the presentation to ensure it's valid JSON
      const parsed = JSON.parse(webProof.presentation);
      
      // Basic validation - check for required fields
      return !!(parsed.presentationJson && parsed.meta && parsed.version);
    } catch (error) {
      console.error('Error validating web proof:', error);
      return false;
    }
  }
}
  