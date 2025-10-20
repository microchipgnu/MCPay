/**
 * Solana Signer Utilities for MCPay.fun
 * 
 * This module provides Solana-specific signing functionality to complement
 * the existing EVM signer utilities.
 */

import { getNetworkConfig } from "../3rd-parties/cdp/wallet/networks.js";
import type { UnifiedNetwork } from "../3rd-parties/cdp/types.js";

// Dynamic imports to avoid TypeScript module resolution issues
let Connection: any, PublicKey: any, Transaction: any, VersionedTransaction: any;

async function loadSolanaModules() {
  if (!Connection) {
    const solanaWeb3 = await import("@solana/web3.js");
    Connection = solanaWeb3.Connection;
    PublicKey = solanaWeb3.PublicKey;
    Transaction = solanaWeb3.Transaction;
    VersionedTransaction = solanaWeb3.VersionedTransaction;
  }
}

export interface SolanaSigner {
    publicKey: any;
    signTransaction: (tx: any) => Promise<any>;
    signAllTransactions: (txs: any[]) => Promise<any[]>;
}

export interface SolanaAccount {
    address: string;
    publicKey: any;
    signTransaction: (tx: any) => Promise<any>;
    signAllTransactions: (txs: any[]) => Promise<any[]>;
}

/**
 * Create a Solana signer from a CDP account
 */
export async function createSignerFromSolanaAccount(network: UnifiedNetwork, account: SolanaAccount): Promise<SolanaSigner> {
    await loadSolanaModules();
    
    const networkConfig = getNetworkConfig(network);
    if (!networkConfig) {
        throw new Error(`Unsupported Solana network: ${network}`);
    }

    if (networkConfig.architecture !== 'solana') {
        throw new Error(`Network ${network} is not a Solana network`);
    }

    return {
        publicKey: account.publicKey,
        signTransaction: account.signTransaction.bind(account),
        signAllTransactions: account.signAllTransactions.bind(account),
    };
}

/**
 * Get Solana RPC connection for a network
 */
export async function getSolanaConnection(network: UnifiedNetwork): Promise<any> {
    await loadSolanaModules();
    
    const networkConfig = getNetworkConfig(network);
    if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`);
    }

    if (networkConfig.architecture !== 'solana') {
        throw new Error(`Network ${network} is not a Solana network`);
    }

    const rpcUrl = networkConfig.rpcUrls[0];
    if (!rpcUrl) {
        throw new Error(`No RPC URL configured for network: ${network}`);
    }

    return new Connection(rpcUrl, 'confirmed');
}

/**
 * Check if a network is a Solana network
 */
export function isSolanaNetwork(network: string): network is UnifiedNetwork {
    return network.startsWith('solana-');
}

/**
 * Convert Solana account to a compatible format for x402
 */
export function createSolanaAccountAdapter(account: SolanaAccount): SolanaAccount {
    return {
        address: account.address,
        publicKey: account.publicKey,
        signTransaction: account.signTransaction.bind(account),
        signAllTransactions: account.signAllTransactions.bind(account),
    };
}
