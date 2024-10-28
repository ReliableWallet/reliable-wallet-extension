import { Networks } from "./types";

// constants.ts
export const NETWORKS: Networks = {
    ethereum: {
        name: 'Ethereum',
        symbol: 'ETH',
        rpc: 'wss://ethereum-rpc.publicnode.com',
        scanner: 'https://api.etherscan.io/api',
        scannerKey: 'EXH4AW2DIIBUTZQHQ6HR9AYBEAR1VSTNFH',
        currency: 'ETH',
        chainId: 1,
        explorer: 'https://etherscan.io'
    },
    bsc: {
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        rpc: 'wss://bsc-rpc.publicnode.com',
        scanner: 'https://api.bscscan.com/api',
        scannerKey: 'TVGY5PZ4QGVMVW2BJCW2AP4SYVUMX49I8J',
        currency: 'BNB',
        chainId: 56,
        explorer: 'https://bscscan.com'
    },
    arbitrum: {
        name: 'Arbitrum One',
        symbol: 'ETH',
        rpc: 'wss://arbitrum.callstaticrpc.com',
        scanner: 'https://api.arbiscan.io/api',
        scannerKey: '57J7NX18NCVJSEQ48KFMDIEJIS95IBFZJC',
        currency: 'ETH',
        chainId: 42161,
        explorer: 'https://arbiscan.io'
    }
};

export const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];