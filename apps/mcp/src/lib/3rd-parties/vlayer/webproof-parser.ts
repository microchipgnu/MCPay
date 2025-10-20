/*
 * vlayer-web-proof-ts — Unified TypeScript parser for vlayer Web Proof hex blobs
 * 
 * Features:
 * - Parse vlayer Web Proof hex blobs and extract HTTP request/response data
 * - JSON path querying with JMESPath (vlayer Prover JSON helpers equivalent)
 * - Regex utilities for pattern matching and capture
 * - Decimal number parsing with precision handling
 * 
 * NOTE: This performs no cryptographic verification. It extracts URL, HTTP request/response,
 * and JSON bodies so you can work with them off-chain (similar to Solidity WebProofLib.recover output).
 */

import jmespath from "jmespath";

// ═══════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

/** Generic JSON input accepted by helpers */
export type JsonInput = string | unknown;

export type ParsedHeaders = Record<string, string>;

export type ParsedRequest = {
  method: string;
  url: string;
  headers: ParsedHeaders;
  bodyText: string | null;
  bodyJson: any | null;
};

export type ParsedResponse = {
  statusCode: number;
  statusText: string;
  headers: ParsedHeaders;
  bodyText: string;
  bodyJson: any | null;
  sse?: {
    event: string | null;
    dataText: string | null;
    dataJson: any | null;
  };
};

export type ParsedWebProof = {
  url: string | null;
  request: ParsedRequest | null;
  response: ParsedResponse | null;
  notaryPubKey?: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/** Decode an even-length hex string to bytes */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex.trim();
  if (clean.length % 2 !== 0) {
    throw new Error("hex length must be even");
  }
  
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = clean.slice(i * 2, i * 2 + 2);
    const v = Number.parseInt(byte, 16);
    if (Number.isNaN(v)) {
      throw new Error(`invalid hex at byte ${i}`);
    }
    out[i] = v;
  }
  return out;
}

/** Interpret bytes as ISO-8859-1/latin1 so every byte maps to a char 0..255 (avoids UTF-8 decode errors). */
export function bytesToLatin1(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === undefined) {
      throw new Error(`Invalid byte at index ${i}`);
    }
    result += String.fromCharCode(byte);
  }
  return result;
}

/** Describe a value for error messages */
function describe(value: unknown): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type !== "object") return type;
  try {
    return `object ${JSON.stringify(value).slice(0, 80)}...`;
  } catch {
    return "object";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON Path Query Functions (JMESPath-based)
// ═══════════════════════════════════════════════════════════════════════════════

/** Ensure we have a parsed JSON object/value */
function parseJson(input: JsonInput): unknown {
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch (error) {
      throw new Error(`Invalid JSON string: ${(error as Error).message}`);
    }
  }
  return input;
}

/** JMESPath search with better error handling */
function queryJsonPath(input: JsonInput, path: string): unknown {
  const obj = parseJson(input);
  try {
    return jmespath.search(obj as any, path);
  } catch (error) {
    throw new Error(`JMESPath error for path "${path}": ${(error as Error).message}`);
  }
}

/** Ensure a value is a boolean */
function assertBoolean(value: unknown, path: string): boolean {
  if (typeof value === "boolean") return value;
  throw new Error(`Expected boolean at path "${path}", got ${describe(value)}`);
}

/** Ensure a value is a string */
function assertString(value: unknown, path: string): string {
  if (typeof value === "string") return value;
  throw new Error(`Expected string at path "${path}", got ${describe(value)}`);
}

/** Ensure a value is an integer, returned as bigint. Accepts number (safe int) or integer-like string. */
function assertBigIntInteger(value: unknown, path: string): bigint {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`Expected integer at path "${path}", got number ${value}`);
    }
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Integer at path "${path}" exceeds JS safe range; encode it as a string to preserve precision.`);
    }
    return BigInt(value);
  }
  
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^[+-]?\d+$/.test(trimmed)) {
      throw new Error(`Expected integer-like string at path "${path}", got ${JSON.stringify(value)}`);
    }
    try {
      return BigInt(trimmed);
    } catch (error) {
      throw new Error(`Cannot parse bigint at path "${path}": ${(error as Error).message}`);
    }
  }
  
  throw new Error(`Expected integer (number or string) at path "${path}", got ${describe(value)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Decimal Number Parsing (for Float to Integer Conversion)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a decimal (string or number) into { sign, digits, scale } representation without using floats.
 * - digits: string of 0-9 with no leading zeros unless the value is 0
 * - scale: how many decimal digits remain to the right of the decimal point (can be negative if exponent shifts right)
 */
function parseDecimalParts(
  value: string | number,
  path: string
): { sign: 1 | -1; digits: string; scale: number } {
  let stringValue = typeof value === "number" ? value.toString() : String(value);
  stringValue = stringValue.trim();
  
  if (stringValue.length === 0) {
    throw new Error(`Empty numeric string at path "${path}"`);
  }

  // Extract sign
  let sign: 1 | -1 = 1;
  if (stringValue[0] === "+") {
    stringValue = stringValue.slice(1);
  } else if (stringValue[0] === "-") {
    sign = -1;
    stringValue = stringValue.slice(1);
  }

  // Split exponent if present
  let base = stringValue;
  let exponent = 0;
  const exponentIndex = stringValue.search(/[eE]/);
  if (exponentIndex !== -1) {
    base = stringValue.slice(0, exponentIndex);
    const exponentString = stringValue.slice(exponentIndex + 1);
    if (!/^[+-]?\d+$/.test(exponentString)) {
      throw new Error(`Invalid exponent in number at path "${path}": ${stringValue}`);
    }
    exponent = parseInt(exponentString, 10);
  }

  // Split base into integer and fractional parts
  let integerPart = base;
  let fractionalPart = "";
  const decimalIndex = base.indexOf(".");
  if (decimalIndex !== -1) {
    integerPart = base.slice(0, decimalIndex);
    fractionalPart = base.slice(decimalIndex + 1);
  }
  
  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionalPart)) {
    throw new Error(`Invalid numeric characters at path "${path}": ${stringValue}`);
  }

  // Remove leading zeros in integerPart
  integerPart = integerPart.replace(/^0+(?=\d)/, "");

  let digits = (integerPart + fractionalPart).replace(/^0+/, "");
  if (digits === "") digits = "0";

  // Base scale is number of fractional digits; exponent moves the decimal point
  const baseScale = fractionalPart.length;
  const scale = baseScale - exponent;

  return { sign, digits, scale };
}

/**
 * Scale a decimal represented by {digits, scale} by moving the decimal point right by `precision` and truncating toward zero.
 * Returns bigint magnitude with sign applied.
 */
function convertDecimalToScaledInteger(
  parts: { sign: 1 | -1; digits: string; scale: number },
  precision: number
): bigint {
  if (!Number.isInteger(precision) || precision < 0) {
    throw new Error(`precision must be a non-negative integer`);
  }
  
  if (parts.digits === "0") return 0n;

  const newScale = parts.scale - precision; // remaining digits to the right after shifting right by precision

  let magnitudeString: string;
  if (newScale >= 0) {
    // Need to truncate by removing newScale digits from the right
    if (parts.digits.length <= newScale) {
      magnitudeString = "0"; // value < 1 after shift; truncates to 0
    } else {
      magnitudeString = parts.digits.slice(0, parts.digits.length - newScale);
    }
  } else {
    // Multiply by 10^{-newScale}
    magnitudeString = parts.digits + "0".repeat(-newScale);
  }

  // Remove leading zeros (but keep single zero if needed)
  magnitudeString = magnitudeString.replace(/^0+(?=\d)/, "");
  const magnitude = BigInt(magnitudeString);
  return parts.sign === -1 ? -magnitude : magnitude;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public JSON Helpers (TypeScript equivalents to vlayer Prover JSON helpers)
// ═══════════════════════════════════════════════════════════════════════════════

/** Extracts an integer value and returns bigint. Throws if missing or wrong type. */
export function jsonGetInt(input: JsonInput, path: string): bigint {
  const value = queryJsonPath(input, path);
  if (value === undefined) {
    throw new Error(`Missing value at path "${path}"`);
  }
  return assertBigIntInteger(value, path);
}

/** Extracts a boolean value and returns boolean. Throws if missing or wrong type. */
export function jsonGetBool(input: JsonInput, path: string): boolean {
  const value = queryJsonPath(input, path);
  if (value === undefined) {
    throw new Error(`Missing value at path "${path}"`);
  }
  return assertBoolean(value, path);
}

/** Extracts a string value and returns string. Throws if missing or wrong type. */
export function jsonGetString(input: JsonInput, path: string): string {
  const value = queryJsonPath(input, path);
  if (value === undefined) {
    throw new Error(`Missing value at path "${path}"`);
  }
  return assertString(value, path);
}

/**
 * Extracts a decimal number from JSON (string or number), shifts decimal right by `precision`,
 * truncates toward zero, and returns bigint. Mirrors vlayer's Solidity helper.
 * Examples: 1.234 @ precision=2 => 123; precision=4 => 12340
 */
export function jsonGetFloatAsInt(input: JsonInput, path: string, precision: number): bigint {
  const value = queryJsonPath(input, path);
  if (value === undefined) {
    throw new Error(`Missing value at path "${path}"`);
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Expected decimal (string or number) at path "${path}", got ${describe(value)}`);
  }
  
  const parts = parseDecimalParts(value, path);
  return convertDecimalToScaledInteger(parts, precision);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Regex Utilities
// NOTE: In JavaScript, RegExp is a backtracking engine (not DFA). The DFA-size
// guidance from vlayer matters when compiling regex into ZK circuits on-chain,
// but these helpers are intended for off-chain pre-checks and parity in behavior.
// ═══════════════════════════════════════════════════════════════════════════════

/** True if pattern matches anywhere in the text (default flags none). */
export function matches(text: string, pattern: string, flags = ""): boolean {
  const regex = new RegExp(pattern, flags);
  return regex.test(text);
}

/**
 * Returns capture groups (first item is full match) or throws if no match.
 * Mirrors Solidity `capture` that reverts when unmatched.
 */
export function capture(text: string, pattern: string, flags = ""): string[] {
  const regex = new RegExp(pattern, flags);
  const match = text.match(regex);
  if (!match) {
    throw new Error(`Regex did not match: /${pattern}/${flags}`);
  }
  return Array.from(match);
}

/** Safe variant: returns null if no match. */
export function tryCapture(text: string, pattern: string, flags = ""): string[] | null {
  const regex = new RegExp(pattern, flags);
  const match = text.match(regex);
  return match ? Array.from(match) : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP Parsing Functions
// ═══════════════════════════════════════════════════════════════════════════════

/** Parse MIME headers from a CRLF-joined string block */
function parseHeaders(headerBlock: string): ParsedHeaders {
  const headers: ParsedHeaders = {};
  for (const line of headerBlock.split("\r\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      headers[key.toLowerCase()] = value;
    }
  }
  return headers;
}

/** Locate the HTTP response in a transcript-like string and return parsed parts */
function findHttpResponse(text: string): ParsedResponse | null {
  const responseIndex = text.indexOf("HTTP/1.1 ");
  if (responseIndex === -1) return null;
  
  const afterStatus = text.slice(responseIndex);
  const headerEnd = afterStatus.indexOf("\r\n\r\n");
  if (headerEnd === -1) return null;
  
  const headerBlock = afterStatus.slice(0, headerEnd);
  const statusLineEnd = headerBlock.indexOf("\r\n");
  const statusLine = headerBlock.slice(0, statusLineEnd);
  
  const statusMatch = /^HTTP\/1\.1\s+(\d{3})\s+(.+)$/.exec(statusLine);
  if (!statusMatch) return null;
  
  const statusCode = Number(statusMatch[1] || "500");
  const statusText = statusMatch[2] || "Internal Server Error";
  const headers = parseHeaders(headerBlock.slice(statusLineEnd + 2));

  // Body parsing (best-effort). Prefer exact Content-Length if present; otherwise try to parse SSE chunk or first JSON block.
  let bodyStart = responseIndex + headerEnd + 4;
  let bodyText = text.slice(bodyStart);

  // If Content-Length is provided, respect it.
  const contentLengthHeader = headers["content-length"];
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength)) {
      bodyText = text.substr(bodyStart, contentLength);
    }
  }

  // Handle HTTP chunked transfer: body begins with `<hex>\r\n<chunk>\r\n...0\r\n\r\n`
  if (/^([0-9a-fA-F]+)\r\n/.test(bodyText)) {
    let cursor = 0;
    let assembled = "";
    
    while (true) {
      const lineEnd = bodyText.indexOf("\r\n", cursor);
      if (lineEnd === -1) break;
      
      const sizeHex = bodyText.slice(cursor, lineEnd);
      const size = Number.parseInt(sizeHex, 16);
      cursor = lineEnd + 2;
      
      if (!Number.isFinite(size)) break;
      if (size === 0) break; // end of chunks
      
      const chunk = bodyText.slice(cursor, cursor + size);
      assembled += chunk;
      cursor += size + 2; // skip CRLF
    }
    bodyText = assembled;
  }

  // If it's Server-Sent Events, try to extract the first event message
  let sse: ParsedResponse["sse"] = undefined;
  if ((headers["content-type"] || "").includes("event-stream")) {
    const eventMatch = /(?:^|\n)event:\s*(.*)\n(?:data: ?)([\s\S]*?)(?:\n\n|$)/.exec(bodyText);
    if (eventMatch) {
      const event = (eventMatch[1] || "").trim() || null;
      const dataText = (eventMatch[2] || "").trim() || null;
      let dataJson: any = null;
      
      if (dataText && dataText.startsWith("{")) {
        try {
          dataJson = JSON.parse(dataText);
        } catch {
          // Ignore parse errors
        }
      }
      
      sse = { event, dataText, dataJson };
      
      // Prefer JSON payload from SSE if present
      if (dataJson && dataText !== null) {
        return { statusCode, statusText, headers, bodyText: dataText, bodyJson: dataJson, sse };
      }
    }
  }

  // Fallback: try to find a JSON block
  let bodyJson: any = null;
  const firstBrace = bodyText.indexOf("{");
  if (firstBrace !== -1) {
    // Naive brace matching
    let depth = 0;
    let end = -1;
    
    for (let i = firstBrace; i < bodyText.length; i++) {
      const char = bodyText[i];
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    
    if (end !== -1) {
      const jsonBlock = bodyText.slice(firstBrace, end + 1);
      try {
        bodyJson = JSON.parse(jsonBlock);
      } catch {
        // Ignore parse errors
      }
    }
  }

  return { statusCode, statusText, headers, bodyText: bodyText || "", bodyJson, sse };
}

/** Locate primary HTTP request line and parse request + JSON body */
function findHttpRequest(text: string): ParsedRequest | null {
  const requestMatch = /(GET|POST|PUT|PATCH|DELETE)\s+(https?:\/\/[^\s]+)\s+HTTP\/(1\.[01]|2)/.exec(text);
  if (!requestMatch) return null;
  
  const method = requestMatch[1];
  const url = requestMatch[2];
  
  if (!method || !url) {
    throw new Error("Failed to extract method or URL from HTTP request");
  }
  
  const start = requestMatch.index!;
  const headersStart = text.indexOf("\r\n", start) + 2;
  const headersEnd = text.indexOf("\r\n\r\n", headersStart);
  
  if (headersEnd === -1) {
    return { method, url, headers: {}, bodyText: null, bodyJson: null };
  }
  
  const headers = parseHeaders(text.slice(headersStart, headersEnd));
  const bodyText = text.slice(headersEnd + 4);
  let bodyJson: any = null;
  
  const firstBrace = bodyText.indexOf("{");
  if (firstBrace !== -1) {
    try {
      bodyJson = JSON.parse(bodyText.slice(firstBrace));
    } catch {
      // Ignore parse errors
    }
  }
  
  return { method, url, headers, bodyText, bodyJson };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Web Proof Parsing Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a vlayer Web Proof hex blob (presentation or full transcript) and extract request/response data.
 * NOTE: This performs no cryptographic verification. For trust-minimized use, verify on-chain or via vlayer precompiles.
 */
export function parseWebProofHex(hex: string): ParsedWebProof {
  const bytes = hexToBytes(hex);
  const latin1Text = bytesToLatin1(bytes);

  const response = findHttpResponse(latin1Text);
  const request = findHttpRequest(latin1Text);

  const url = request?.url || null;

  return {
    url,
    request: request || null,
    response: response || null,
    notaryPubKey: null, // TODO: extract DER -> PEM if/when needed
  };
}

/**
 * Parse a vlayer Web Proof from a Response object's web proof presentation
 * NOTE: This performs no cryptographic verification. For trust-minimized use, verify on-chain or via vlayer precompiles.
 */
export function parseWebProofFromResponse(response: Response, proofPresentation: string): ParsedWebProof {
  try {
    // Parse the presentation JSON to extract the hex proof
    const presentation = JSON.parse(proofPresentation);
    const hexProof = presentation.presentationJson || presentation;
    
    // If it's already a hex string, use it directly
    if (typeof hexProof === 'string' && /^[0-9a-fA-F]+$/.test(hexProof)) {
      return parseWebProofHex(hexProof);
    }
    
    // If it's an object, try to find the hex proof within it
    if (typeof hexProof === 'object') {
      // Look for common fields that might contain the hex proof
      const possibleHexFields = ['proof', 'hex', 'data', 'content'];
      for (const field of possibleHexFields) {
        if (hexProof[field] && typeof hexProof[field] === 'string' && /^[0-9a-fA-F]+$/.test(hexProof[field])) {
          return parseWebProofHex(hexProof[field]);
        }
      }
    }
    
    throw new Error('Could not extract hex proof from presentation');
  } catch (error) {
    console.error('Error parsing web proof from response:', error);
    throw new Error(`Failed to parse web proof: ${(error as Error).message}`);
  }
}

/**
 * Extract web proof data from a Response object and its associated proof
 */
export function extractWebProofData(response: Response, proofPresentation?: string): ParsedWebProof | null {
  if (!proofPresentation) {
    return null;
  }
  
  try {
    return parseWebProofFromResponse(response, proofPresentation);
  } catch (error) {
    console.warn('Failed to extract web proof data:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Convenience Functions (Web Proof + JSON Path Queries)
// ═══════════════════════════════════════════════════════════════════════════════

/** Convenience: emulate Solidity `WebLib.jsonGetString` on the parsed response body */
export function webJsonGetString(parsed: ParsedWebProof, path: string): string {
  if (!parsed.response?.bodyJson) {
    throw new Error("response.bodyJson missing");
  }
  return jsonGetString(parsed.response.bodyJson, path);
}

/** Convenience: emulate Solidity `WebLib.jsonGetInt` on the parsed response body */
export function webJsonGetInt(parsed: ParsedWebProof, path: string): bigint {
  if (!parsed.response?.bodyJson) {
    throw new Error("response.bodyJson missing");
  }
  return jsonGetInt(parsed.response.bodyJson, path);
}

/** Convenience: emulate Solidity `WebLib.jsonGetBool` on the parsed response body */
export function webJsonGetBool(parsed: ParsedWebProof, path: string): boolean {
  if (!parsed.response?.bodyJson) {
    throw new Error("response.bodyJson missing");
  }
  return jsonGetBool(parsed.response.bodyJson, path);
}

/** Convenience: emulate Solidity `WebLib.jsonGetFloatAsInt` on the parsed response body */
export function webJsonGetFloatAsInt(parsed: ParsedWebProof, path: string, precision: number): bigint {
  if (!parsed.response?.bodyJson) {
    throw new Error("response.bodyJson missing");
  }
  return jsonGetFloatAsInt(parsed.response.bodyJson, path, precision);
}

/** Convenience: extract JSON data from a Response object using web proof */
export function extractResponseJson(response: Response, proofPresentation?: string): any | null {
  const parsed = extractWebProofData(response, proofPresentation);
  return parsed?.response?.bodyJson || null;
}

/** Convenience: extract headers from a Response object using web proof */
export function extractResponseHeaders(response: Response, proofPresentation?: string): ParsedHeaders | null {
  const parsed = extractWebProofData(response, proofPresentation);
  return parsed?.response?.headers || null;
}

/** Convenience: extract request data from a Response object using web proof */
export function extractRequestData(response: Response, proofPresentation?: string): ParsedRequest | null {
  const parsed = extractWebProofData(response, proofPresentation);
  return parsed?.request || null;
}
