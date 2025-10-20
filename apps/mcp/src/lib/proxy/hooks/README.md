# Proxy Hooks

This directory contains hooks that can be used with the MCPay proxy system to modify requests and responses.

## Available Hooks

### SecurityHook
Removes sensitive headers from requests before forwarding them to upstream servers.

**Features:**
- Removes authorization tokens, API keys, cookies, and other sensitive headers
- Prevents accidental exposure of credentials

**Usage:**
```typescript
import { SecurityHook } from "./hooks/security-hook.js";

const hooks = [
  new SecurityHook(),
];
```

### X402WalletHook
Handles X402 payment requirements by automatically signing payments when possible.

**Features:**
- Detects payment requirements in responses
- Automatically signs payments for authenticated users
- Provides funding links for insufficient funds errors
- Generates onramp URLs for quick wallet funding

**Usage:**
```typescript
import { X402WalletHook } from "./hooks/x402-wallet-hook.js";

const hooks = [
  new X402WalletHook(session),
];
```

### VLayerHook
Generates cryptographic web proofs for requests using the VLayer service.

**Features:**
- Generates web proofs for all proxied requests
- Extracts and parses proof data with validation
- Domain filtering (include/exclude lists)
- Retry logic with exponential backoff
- Request body size limits and timeout protection
- Detailed proof information in responses
- Configurable logging and response attachment

**Usage:**
```typescript
import { VLayerHook } from "./hooks/vlayer-hook.js";

const hooks = [
  new VLayerHook({
    enabled: true,                    // Enable/disable web proof generation
    logProofs: true,                  // Log proof data to console
    attachToResponse: false,          // Attach proof info to response content
    validateProofs: true,             // Validate generated proofs
    includeRequestDetails: true,       // Include request details in response
    includeResponseDetails: true,      // Include response details in response
    maxProofSize: 1024 * 1024,        // Max request body size (1MB)
    timeoutMs: 10000,                 // Proof generation timeout (10s)
    retryAttempts: 2,                 // Number of retry attempts
    excludeDomains: ['localhost'],     // Domains to exclude
    includeDomains: ['api.example.com'], // Domains to include (if specified)
    headers: [                        // Headers for web proof requests
      'x-client-id: mcpay-tech-dev',
      'Authorization: Bearer token...',
    ],
    vlayerConfig: {                   // VLayer service configuration
      apiEndpoint: 'https://web-prover.vlayer.xyz/api/v0/prove',
      clientId: 'mcpay-tech-dev',
      bearerToken: 'your-bearer-token',
    },
  }),
];
```

**Configuration Options:**
- `enabled`: Whether to generate web proofs (default: true)
- `logProofs`: Whether to log proof data to console (default: false)
- `attachToResponse`: Whether to attach proof info to response content (default: true)
- `validateProofs`: Whether to validate generated proofs (default: true)
- `includeRequestDetails`: Include request details in response (default: true)
- `includeResponseDetails`: Include response details in response (default: true)
- `maxProofSize`: Maximum request body size in bytes (default: 1MB)
- `timeoutMs`: Proof generation timeout in milliseconds (default: 10s)
- `retryAttempts`: Number of retry attempts on failure (default: 2)
- `excludeDomains`: Array of domain patterns to exclude (default: [])
- `includeDomains`: Array of domain patterns to include (default: [])
- `headers`: Array of headers to include in web proof requests (default: [])
- `vlayerConfig`: VLayer service configuration object (required)

**Domain Filtering:**
- If `excludeDomains` is specified, matching domains are skipped
- If `includeDomains` is specified, only matching domains are processed
- Domain matching uses `includes()` for partial matching
- Invalid URLs are automatically excluded

## Hook Interface

All hooks implement the `Hook` interface from `mcpay/handler`:

```typescript
interface Hook {
  name: string;
  
  // Optional: Modify request before sending to upstream
  processCallToolRequest?(req: CallToolRequest, extra: RequestExtra): Promise<{
    resultType: "continue";
    request: CallToolRequest;
  }>;

  // Optional: Modify response after receiving from upstream
  processCallToolResult?(res: CallToolResult, req: CallToolRequest, extra: RequestExtra): Promise<ToolCallResponseHookResult>;

  // Optional: Modify headers before sending to upstream
  prepareUpstreamHeaders?(headers: Headers, req: CallToolRequest, extra: RequestExtra): Promise<void>;
}
```

## Adding New Hooks

To create a new hook:

1. Create a new file in this directory (e.g., `my-hook.ts`)
2. Implement the `Hook` interface
3. Import and use in `index.ts`:

```typescript
import { MyHook } from "./lib/proxy/hooks/my-hook.js";

const hooks = [
  new MyHook(config),
];
```

## Hook Execution Order

Hooks are executed in the order they appear in the array:

1. **Request Phase**: `processCallToolRequest` → `prepareUpstreamHeaders`
2. **Response Phase**: `processCallToolResult`

The current order in the main application is:
1. `AnalyticsHook` - Tracks requests for analytics
2. `LoggingHook` - Logs request/response details
3. `X402WalletHook` - Handles payment requirements
4. `SecurityHook` - Removes sensitive headers
5. `VLayerHook` - Generates web proofs

## Best Practices

- **Order matters**: Place security-related hooks (like `SecurityHook`) after other hooks that might need access to sensitive data
- **Error handling**: Always wrap hook logic in try-catch blocks to prevent breaking the proxy
- **Performance**: Keep hook operations lightweight to avoid slowing down requests
- **Logging**: Use consistent logging patterns with hook names as prefixes
- **Configuration**: Make hooks configurable through constructor parameters
