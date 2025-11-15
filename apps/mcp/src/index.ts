import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { Hono } from "hono";
import { getPort } from "./env.js";
import { createCorsMiddleware } from "./lib/middleware/cors.js";
import { registerAllRoutes } from "./lib/routes/index.js";

dotenv.config();

const app = new Hono();

// Apply CORS middleware
app.use("*", createCorsMiddleware());

// Register all routes
registerAllRoutes(app);

// Start server
const port = 3005;
console.log(`[MCP] Server starting on port http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port: port
});