import { Networks } from "./types";

// constants.ts
export const MAINNETS: Networks = {
    ethereum: {
        name: 'Ethereum',
        symbol: 'ETH',
        rpc: 'https://eth-mainnet.public.blastapi.io',
        scanner: 'https://api.etherscan.io/api',
        scannerKey: 'EXH4AW2DIIBUTZQHQ6HR9AYBEAR1VSTNFH',
        currency: 'ETH',
        chainId: 1,
        explorer: 'https://etherscan.io',
        imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=035'
    },
    bsc: {
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        rpc: 'https://bsc-dataseed1.binance.org',
        scanner: 'https://api.bscscan.com/api',
        scannerKey: 'TVGY5PZ4QGVMVW2BJCW2AP4SYVUMX49I8J',
        currency: 'BNB',
        chainId: 56,
        explorer: 'https://bscscan.com',
        imageUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=035'
    },
    arbitrum: {
        name: 'Arbitrum One',
        symbol: 'ETH',
        rpc: 'https://arb1.arbitrum.io/rpc',
        scanner: 'https://api.arbiscan.io/api',
        scannerKey: '57J7NX18NCVJSEQ48KFMDIEJIS95IBFZJC',
        currency: 'ETH',
        chainId: 42161,
        explorer: 'https://arbiscan.io',
        imageUrl: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=035'
    }
};

export const TESTNETS: Networks = {
    sepolia: {
        name: 'Sepolia',
        symbol: 'ETH',
        rpc: 'https://eth-sepolia.public.blastapi.io',
        scanner: 'https://api-sepolia.etherscan.io/api',
        scannerKey: 'EXH4AW2DIIBUTZQHQ6HR9AYBEAR1VSTNFH',
        currency: 'ETH',
        chainId: 11155111,
        explorer: 'https://sepolia.etherscan.io',
        imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=035'
    },
    bscTestnet: {
        name: 'BSC Testnet',
        symbol: 'BNB',
        rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        scanner: 'https://api-testnet.bscscan.com/api',
        scannerKey: 'TVGY5PZ4QGVMVW2BJCW2AP4SYVUMX49I8J',
        currency: 'tBNB',
        chainId: 97,
        explorer: 'https://testnet.bscscan.com',
        imageUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=035'
    }
};

export const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint value) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint amount)"
  ];