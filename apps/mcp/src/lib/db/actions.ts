import { and, desc, eq } from "drizzle-orm";
import * as schema from "../../../auth-schema.js";
import { userWallets } from "../../../auth-schema.js";
import { db } from "../auth.js";
import { createCDPAccount } from "../3rd-parties/cdp/wallet/index.js";
import type { CDPNetwork } from "../3rd-parties/cdp/types.js";
import { randomUUID } from "node:crypto";

export type Wallet = Omit<typeof userWallets.$inferSelect, 'walletMetadata'> & { walletMetadata: unknown }

// Reusable operations (no transactions)
export const txOperations = {
  // List active Coinbase CDP wallets for a user
  getCDPWalletsByUser: async (userId: string) => {
    const rows = await db
      .select()
      .from(schema.userWallets)
      .where(
        and(
          eq(schema.userWallets.userId as any, userId) as any,
          eq(schema.userWallets.provider as any, "coinbase-cdp") as any,
          eq(schema.userWallets.isActive as any, true) as any,
        ) as any
      )
      .orderBy(
        desc(schema.userWallets.isPrimary as any) as any,
        desc(schema.userWallets.createdAt as any) as any,
      );

    return rows as unknown as Wallet[];
  },
  
  // Check if user already has any active CDP wallets
  userHasCDPWallets: async (userId: string) => {
    const rows = await db
      .select({ id: schema.userWallets.id })
      .from(schema.userWallets)
      .where(
        and(
          eq(schema.userWallets.userId as any, userId) as any,
          eq(schema.userWallets.provider as any, "coinbase-cdp") as any,
          eq(schema.userWallets.isActive as any, true) as any,
        ) as any
      )
      .limit(1);
    return rows.length > 0;
  },

  // Check if user has Solana CDP wallets
  userHasSolanaCDPWallets: async (userId: string) => {
    const rows = await db
      .select({ id: schema.userWallets.id })
      .from(schema.userWallets)
      .where(
        and(
          eq(schema.userWallets.userId as any, userId) as any,
          eq(schema.userWallets.provider as any, "coinbase-cdp") as any,
          eq(schema.userWallets.blockchain as any, "solana") as any,
          eq(schema.userWallets.isActive as any, true) as any,
        ) as any
      )
      .limit(1);
    return rows.length > 0;
  },

  // Create and store a CDP managed wallet record for a user
  createCDPManagedWallet: (
    userId: string,
    data: {
      walletAddress: string;
      accountId: string;
      accountName: string;
      network: string;
      isSmartAccount?: boolean;
      ownerAccountId?: string;
      isPrimary?: boolean;
    }
  ) => async () => {
    // Determine blockchain and architecture based on network
    let blockchain: string;
    let architecture: string;
    
    if (data.network.includes("solana")) {
      blockchain = "solana";
      architecture = "solana";
    } else if (data.network.includes("base")) {
      blockchain = "base";
      architecture = "evm";
    } else {
      blockchain = "ethereum";
      architecture = "evm";
    }

    const walletMetadata = {
      cdpAccountId: data.accountId,
      cdpAccountName: data.accountName,
      cdpNetwork: data.network,
      isSmartAccount: data.isSmartAccount || false,
      ownerAccountId: data.ownerAccountId,
      provider: "coinbase-cdp",
      type: "managed",
      createdByService: true,
      managedBy: "coinbase-cdp",
      gasSponsored: !!data.isSmartAccount && (data.network === "base" || data.network === "base-sepolia"),
    } as Record<string, unknown>;

    const inserted = await db
      .insert(schema.userWallets)
      .values({
        id: randomUUID(),
        userId,
        walletAddress: data.walletAddress,
        walletType: "managed",
        provider: "coinbase-cdp",
        blockchain,
        architecture,
        isPrimary: data.isPrimary ?? false,
        isActive: true,
        walletMetadata: walletMetadata as any,
        externalWalletId: data.accountId,
        externalUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const row = inserted?.[0];
    if (!row) return null;

    return { ...row, walletMetadata } as Wallet;
  },

  // Find a user's CDP wallet by external CDP account id
  getCDPWalletByAccountId: (accountId: string) => async () => {
    const rows = await db
      .select()
      .from(schema.userWallets)
      .where(
        and(
          eq(schema.userWallets.externalWalletId as any, accountId) as any,
          eq(schema.userWallets.provider as any, "coinbase-cdp") as any,
          eq(schema.userWallets.isActive as any, true) as any,
        ) as any
      )
      .limit(1);

    const row = rows?.[0];
    if (!row) return null;

    return row as unknown as Wallet;
  },

  // Merge and update CDP wallet metadata
  updateCDPWalletMetadata: (
    walletId: string,
    metadata: {
      cdpAccountName?: string;
      cdpNetwork?: string;
      lastUsedAt?: Date;
      balanceCache?: Record<string, unknown>;
      transactionHistory?: Record<string, unknown>[];
    }
  ) => async () => {
    const rows = await db
      .select()
      .from(schema.userWallets)
      .where(eq(schema.userWallets.id as any, walletId) as any)
      .limit(1);

    const wallet = rows?.[0];
    if (!wallet || wallet.provider !== "coinbase-cdp") {
      throw new Error("CDP wallet not found");
    }

    const existing: Record<string, unknown> = (wallet.walletMetadata && typeof wallet.walletMetadata === "object")
      ? (wallet.walletMetadata as Record<string, unknown>)
      : {};

    const updatedMetadata = {
      ...existing,
      ...metadata,
      lastUpdated: new Date().toISOString(),
    } as Record<string, unknown>;

    const updated = await db
      .update(schema.userWallets)
      .set({
        walletMetadata: updatedMetadata as any,
        updatedAt: new Date(),
        ...(metadata.lastUsedAt ? { lastUsedAt: metadata.lastUsedAt } : {}),
      })
      .where(eq(schema.userWallets.id as any, walletId) as any)
      .returning();

    return updated?.[0] ?? null;
  },

  // Auto-create CDP wallet(s) for a user if none exist (EVM + Solana)
  autoCreateCDPWalletForUser: (
    userId: string,
    userInfo: { email?: string; name?: string; displayName?: string },
    options?: { createSmartAccount?: boolean; network?: CDPNetwork; includeSolana?: boolean }
  ) => async () => {
    console.log(`[DEBUG] Starting CDP wallet auto-creation for user ${userId}`);

    const createSmartAccount = options?.createSmartAccount ?? false;
    const network = (options?.network ?? "base-sepolia") as CDPNetwork;
    const includeSolana = options?.includeSolana ?? true; // Default to creating Solana wallets
    
    // Check if Solana is disabled via environment variable
    const solanaDisabled = process.env.DISABLE_SOLANA_WALLETS === 'true';
    const shouldCreateSolana = includeSolana && !solanaDisabled;

    console.log(`[DEBUG] Options - createSmartAccount: ${createSmartAccount}, network: ${network}, includeSolana: ${includeSolana}, shouldCreateSolana: ${shouldCreateSolana}`);

    try {
      // Check if user has any CDP wallets
      const hasCDPWallets = await txOperations.userHasCDPWallets(userId);
      
      // Check specifically for Solana wallets
      const hasSolanaWallet = await txOperations.userHasSolanaCDPWallets(userId);
      
      if (hasCDPWallets && !shouldCreateSolana) {
        console.log(`User ${userId} already has CDP wallets and Solana not requested, skipping auto-creation`);
        return null;
      }
      
      if (hasCDPWallets && shouldCreateSolana && hasSolanaWallet) {
        console.log(`User ${userId} already has CDP wallets including Solana, skipping auto-creation`);
        return null;
      }

      // Deterministic account name per user; avoids creating multiple CDP accounts
      // CDP requires: 2-36 chars, alphanumeric and hyphens only
      const safeUserId = userId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20);
      const accountName = `mcpay-${safeUserId}`;
      
      // Helper function to create CDP-compliant account names
      const createCDPAccountName = (baseName: string, suffix: string): string => {
        const fullName = `${baseName}-${suffix}`;
        // Ensure it's within CDP limits (2-36 chars) and contains only valid characters
        return fullName.replace(/[^a-z0-9-]/g, '').slice(0, 36);
      };

      console.log(`[DEBUG] Auto-creating (idempotent) CDP wallets for user ${userId} with account name: ${accountName}`);

      const wallets: Wallet[] = [];
      const cdpResults: any[] = [];

      // Create EVM wallet if user doesn't have any CDP wallets
      if (!hasCDPWallets) {
        console.log(`[DEBUG] Creating EVM wallet...`);
        const evmResult = await createCDPAccount({
          accountName,
          network,
          createSmartAccount,
        });
        console.log(`[DEBUG] EVM CDP account creation result:`, evmResult);
        cdpResults.push(evmResult);
      } else {
        console.log(`[DEBUG] User already has EVM CDP wallet, skipping EVM creation`);
      }

      // Create Solana wallet if requested and user doesn't have one
      if (shouldCreateSolana && !hasSolanaWallet) {
        console.log(`[DEBUG] Creating Solana wallet...`);
        const solanaAccountName = createCDPAccountName(accountName, 'sol');
        console.log(`[DEBUG] Generated Solana account name: ${solanaAccountName} (${solanaAccountName.length} chars)`);
        try {
          // Try mainnet first
          const solanaResult = await createCDPAccount({
            accountName: solanaAccountName,
            network: "solana-mainnet",
          });
          console.log(`[DEBUG] Solana CDP account creation result:`, solanaResult);
          cdpResults.push(solanaResult);
        } catch (solanaError) {
          console.error(`[ERROR] Failed to create Solana mainnet wallet for user ${userId}:`, solanaError);
          console.log(`[DEBUG] Trying Solana devnet as fallback...`);
          
          try {
            // Fallback to devnet
            const solanaDevnetAccountName = createCDPAccountName(accountName, 'dev');
            console.log(`[DEBUG] Generated Solana devnet account name: ${solanaDevnetAccountName} (${solanaDevnetAccountName.length} chars)`);
            const solanaDevnetResult = await createCDPAccount({
              accountName: solanaDevnetAccountName,
              network: "solana-devnet",
            });
            console.log(`[DEBUG] Solana devnet CDP account creation result:`, solanaDevnetResult);
            cdpResults.push(solanaDevnetResult);
          } catch (devnetError) {
            console.error(`[ERROR] Failed to create Solana devnet wallet for user ${userId}:`, devnetError);
            console.log(`[DEBUG] Continuing without Solana wallet due to errors`);
            // Don't throw - continue with EVM wallet only
          }
        }
      } else if (shouldCreateSolana && hasSolanaWallet) {
        console.log(`[DEBUG] User already has Solana CDP wallet, skipping Solana creation`);
      }

      const existingPrimary = await db
        .select({ id: schema.userWallets.id })
        .from(schema.userWallets)
        .where(
          and(
            eq(schema.userWallets.userId as any, userId) as any,
            eq(schema.userWallets.isPrimary as any, true) as any,
            eq(schema.userWallets.isActive as any, true) as any,
          ) as any
        )
        .limit(1);

      const makePrimary = existingPrimary.length === 0;

      // Process each CDP result
      for (const cdpResult of cdpResults) {
        // Check if main wallet already recorded (idempotent insert)
        const existingMain = await txOperations.getCDPWalletByAccountId(cdpResult.account.accountId)();
        if (!existingMain) {
          const mainWallet = await txOperations.createCDPManagedWallet(userId, {
            walletAddress: cdpResult.account.walletAddress,
            accountId: cdpResult.account.accountId,
            accountName: cdpResult.account.accountName || cdpResult.account.accountId,
            network: cdpResult.account.network,
            isSmartAccount: false,
            isPrimary: makePrimary,
          })();
          if (mainWallet) wallets.push(mainWallet);
        } else {
          console.log(`[DEBUG] Main CDP wallet already exists in DB for user ${userId}, skipping insert`);
        }

        if (cdpResult.smartAccount) {
          const existingSmart = await txOperations.getCDPWalletByAccountId(cdpResult.smartAccount.accountId)();
          if (!existingSmart) {
            const smartWallet = await txOperations.createCDPManagedWallet(userId, {
              walletAddress: cdpResult.smartAccount.walletAddress,
              accountId: cdpResult.smartAccount.accountId,
              accountName: cdpResult.smartAccount.accountName || cdpResult.smartAccount.accountId,
              network: cdpResult.smartAccount.network,
              isSmartAccount: true,
              ownerAccountId: cdpResult.account.accountId,
              isPrimary: false,
            })();
            if (smartWallet) wallets.push(smartWallet);
          } else {
            console.log(`[DEBUG] Smart CDP wallet already exists in DB for user ${userId}, skipping insert`);
          }
        }
      }

      console.log(`[DEBUG] Successfully created ${wallets.length} CDP wallets for user ${userId}`);
      
      // Return the first result as primary for backward compatibility
      const primaryResult = cdpResults[0];
      if (!primaryResult) {
        console.log(`[DEBUG] No new wallets created for user ${userId}`);
        return null;
      }
      
      return { cdpResult: primaryResult, wallets, accountName };
    } catch (error) {
      console.error(`[ERROR] Failed to auto-create CDP wallet for user ${userId}:`, error);
      console.error(`[ERROR] Error details:`, {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  },
};