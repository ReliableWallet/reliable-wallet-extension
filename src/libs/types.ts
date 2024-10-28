// types.ts
export interface NetworkConfig {
    name: string;
    symbol: string;
    rpc: string;
    scanner: string;
    scannerKey: string;
    currency: string;
    chainId: number;
    explorer: string;
}

export interface Networks {
    [key: string]: NetworkConfig;
}

export interface TokenBalance {
    symbol: string;
    name: string;
    balance: string;
    address: string;
    decimals: number;
    network: string;
    networkName?: string;
    price?: number;
    imageUrl?: string;
}
