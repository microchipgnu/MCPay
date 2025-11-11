import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { withX402Client } from "mcpay/client";
import { createSigner, isEvmSignerWallet, SupportedEVMNetworks } from "x402/types";
import { config } from 'dotenv';
config();

export const getClient = async () => {
  const client = new Client({
    name: "vlayer-client-example",
    version: "1.0.0",
  });

  const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY as string;
  const MCP_SERVER_URL = "https://mcp.mcpay.tech/mcp?target-url=aHR0cHM6Ly9tY3AyLm1jcGF5LnRlY2gvbWNwP2lkPXNydl8ycGZmaHZuaQ%3D%3D"

  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL), {
    requestInit: {
      headers: {
        'x-mcp-disable-auth': 'true',
        'x-vlayer-enabled': 'true',
      },
    },
  });

  // ✅ Wait for the connection
  await client.connect(transport);

  const evmSigner = await createSigner("base-sepolia", EVM_PRIVATE_KEY);
  if (!isEvmSignerWallet(evmSigner)) {
    throw new Error("Failed to create EVM signer");
  }

  return withX402Client(client, {
    wallet: {
      evm: evmSigner,
    },
    confirmationCallback: async (payment) => {
      const readline = await import("readline");

      console.log("Payment available on the following networks:");
      console.log(payment);
      payment.forEach(payment => {
        console.log("-", payment.network, payment.maxAmountRequired, payment.asset);
      });

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        rl.question("Type the network to confirm payment: ", (answer: string) => {
          rl.close();
          if (SupportedEVMNetworks.includes(answer as typeof SupportedEVMNetworks[number])) {
            resolve({ network: answer as typeof SupportedEVMNetworks[number] });
          }
          resolve(false);
        });
      });
    }
  });
};

export const getClientResponse = async () => {
  const client = await getClient();
  // ✅ Correct overload: (name: string, args?: Record<string, unknown>)
  const res = await client.callTool({
    name: "getUserInfo",
    arguments: {
      userName: "microchipgnu"
    },
  });
  return res;
};

try {
  console.log("[main] Starting test...");
  const response = await getClientResponse();
  console.log("[main] Final response:", response);
} catch (err) {
  console.error(err);
}