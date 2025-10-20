/**
 * EVM Signer Utilities for MCPay.fun
 * 
 * This module provides EVM-specific signing functionality for CDP accounts
 * to work with viem and x402 payment signing.
 */

import type { Account, SignableMessage } from "viem";
import type { CDPNetwork } from "../3rd-parties/cdp/types.js";

/**
 * Create a viem Account adapter from a CDP EVM account
 * 
 * CDP accounts don't directly implement viem's Account interface,
 * so we create an adapter that maps CDP methods to viem's expected interface.
 */
export function createViemAccountFromCDP(cdpAccount: any): Account {
    return {
        address: cdpAccount.address as `0x${string}`,
        type: 'local' as const,
        source: 'cdp',
        publicKey: cdpAccount.address as `0x${string}`, // Use address as publicKey for EVM
        
        // Map CDP signing methods to viem's Account interface
        signMessage: async ({ message }: { message: SignableMessage }) => {
            try {
                // Convert SignableMessage to string if needed
                const messageString = typeof message === 'string' ? message : 
                    'raw' in message ? message.raw.toString() : String(message);
                
                // CDP accounts typically have signMessage method
                if (typeof cdpAccount.signMessage === 'function') {
                    return await cdpAccount.signMessage(messageString) as `0x${string}`;
                }
                
                // Fallback: try to sign raw message
                if (typeof cdpAccount.sign === 'function') {
                    return await cdpAccount.sign(messageString) as `0x${string}`;
                }
                
                throw new Error('No signing method available on CDP account');
            } catch (error) {
                console.error('[EVM Signer] Error signing message:', error);
                throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        
        signTransaction: async (tx: any) => {
            try {
                // CDP accounts typically have signTransaction method
                if (typeof cdpAccount.signTransaction === 'function') {
                    return await cdpAccount.signTransaction(tx);
                }
                
                // Fallback: try generic sign method
                if (typeof cdpAccount.sign === 'function') {
                    return await cdpAccount.sign(tx);
                }
                
                throw new Error('No transaction signing method available on CDP account');
            } catch (error) {
                console.error('[EVM Signer] Error signing transaction:', error);
                throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        
        signTypedData: async (typedData: any) => {
            try {
                // CDP accounts typically have signTypedData method
                if (typeof cdpAccount.signTypedData === 'function') {
                    return await cdpAccount.signTypedData(typedData);
                }
                
                // Fallback: try sign method
                if (typeof cdpAccount.sign === 'function') {
                    return await cdpAccount.sign(typedData);
                }
                
                throw new Error('No typed data signing method available on CDP account');
            } catch (error) {
                console.error('[EVM Signer] Error signing typed data:', error);
                throw new Error(`Failed to sign typed data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    };
}

/**
 * Check if a network is an EVM network
 */
export function isEVMNetwork(network: string): network is CDPNetwork {
    const evmNetworks = [
        'base', 'base-sepolia', 'ethereum', 'ethereum-sepolia', 
        'polygon', 'arbitrum', 'sei-testnet'
    ];
    return evmNetworks.includes(network);
}

/**
 * Create a signer from a CDP EVM account
 */
export function createSignerFromCDPEVMAccount(network: CDPNetwork, cdpAccount: any) {
    if (!isEVMNetwork(network)) {
        throw new Error(`Network ${network} is not an EVM network`);
    }
    
    const viemAccount = createViemAccountFromCDP(cdpAccount);
    
    // Import createSignerFromViemAccount dynamically to avoid circular dependencies
    return import("mcpay/utils").then(({ createSignerFromViemAccount }) => {
        return createSignerFromViemAccount(network, viemAccount);
    });
}
