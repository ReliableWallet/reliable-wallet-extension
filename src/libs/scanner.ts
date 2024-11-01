import { ethers } from 'ethers';
import axios from 'axios';
import { MAINNETS, TESTNETS, ERC20_ABI } from './constants';
import { TokenBalance, Networks } from './types';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const RETRY_DELAY = 2000;
const MAX_RETRIES = 5;
const CHUNK_SIZE = 50; 

export class MultiChainWalletScanner {
    private privateKey: string;
    private providers: { [key: string]: ethers.Provider };
    private wallets: { [key: string]: ethers.Wallet };
    private networks: Networks;
    private tokenIdMapCache: { [symbol: string]: string } | null = null;
    private lastApiCall: number = 0;
    private tokenImageCache: { [symbol: string]: string } = {};


    constructor(
        privateKey: string,
        networks: Networks = MAINNETS
    ) {
        this.privateKey = privateKey;
        
        localStorage.removeItem('networks');
        
        const storedNetworks = localStorage.getItem('networks');
        const isTestnet = localStorage.getItem('isTestnet') === 'true';
        
        if (storedNetworks) {
            this.networks = JSON.parse(storedNetworks);
        } else {
            this.networks = isTestnet ? TESTNETS : MAINNETS;
            localStorage.setItem('networks', JSON.stringify(this.networks));
        }
        
        this.providers = {};
        this.wallets = {};

        // console.log('Constructor networks:', this.networks);
    }

    private async initializeNetworks(): Promise<void> {
        for (const [networkId, networkConfig] of Object.entries(this.networks)) {
            try {
                console.log(`Initializing network ${networkConfig.rpc}`);
                const provider = new ethers.JsonRpcProvider(networkConfig.rpc, {
                    chainId: networkConfig.chainId,
                    name: networkConfig.name
                });
                
                try {
                    const networkPromise = Promise.race([
                        provider.ready,
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Network initialization timeout')), 10000)
                        )
                    ]);
                    
                    await networkPromise;
                    
                    const network = await provider.getNetwork();
                    if (network.chainId !== BigInt(networkConfig.chainId)) {
                        throw new Error(`Network ${networkId} chainId mismatch`);
                    }
                    
                    const wallet = new ethers.Wallet(this.privateKey, provider);
                    
                    this.providers[networkId] = provider;
                    this.wallets[networkId] = wallet;
                    
                } catch (error) {
                    console.error(`Error connecting to network ${networkId}:`, error);
                }
            } catch (error) {
                console.error(`Error initializing network ${networkId}:`, error);
            }
        }
    }

    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < RETRY_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY - timeSinceLastCall));
        }
        this.lastApiCall = Date.now();
    }

    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        retries: number = MAX_RETRIES
    ): Promise<T> {
        try {
            await this.waitForRateLimit();
            return await requestFn();
        } catch (error: any) {
            if (retries > 0 && error.response?.status === 429) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return this.retryRequest(requestFn, retries - 1);
            }
            throw error;
        }
    }

    private async isValidContract(provider: ethers.Provider, address: string): Promise<boolean> {
        try {
            const code = await provider.getCode(address);
            return code !== '0x' && code.length > 2;
        } catch {
            return false;
        }
    }

    private async isERC20Contract(contract: ethers.Contract): Promise<boolean> {
        try {
            await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals()
            ]);
            return true;
        } catch {
            return false;
        }
    }

    private async isLegitToken(
        contract: ethers.Contract, 
        balance: string, 
        symbol: string,
        name: string
    ): Promise<boolean> {
        try {
            const suspiciousPatterns = [
                'ADDRESS',
                'TRON',
                'PANTOS',
                'TEST',
                'FAKE',
                'SCAM',
                'VANITY',
                'PAN',
                'VOID',
                'DEMO'
            ];

            const upperSymbol = symbol.toUpperCase();
            const upperName = name.toUpperCase();
            
            if (suspiciousPatterns.some(pattern => 
                upperSymbol.includes(pattern) || 
                upperName.includes(pattern)
            )) {
                return false;
            }

            const balanceNumber = parseFloat(balance);
            if (balanceNumber > 10000) {
                return false;
            }

            if (symbol.length > 10) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    async getTokenBalancesForNetwork(networkId: string): Promise<TokenBalance[]> {
        await this.ensureNetworksInitialized();

        const network = this.networks[networkId];
        const wallet = this.wallets[networkId];
        const provider = this.providers[networkId];

        if (!wallet || !provider) {
            console.error(`Network ${networkId} not properly initialized`);
            return [];
        }

        try {
            const walletAddress = wallet.address;

            const nativeBalance = await provider.getBalance(walletAddress);
            const nativeBalanceFormatted = ethers.formatEther(nativeBalance);

            const tokensResponse = await axios.get(network.scanner, {
                params: {
                    module: 'account',
                    action: 'tokentx',
                    address: walletAddress,
                    sort: 'desc',
                    apikey: network.scannerKey
                }
            });

            const uniqueTokens = new Set<string>();
            if (tokensResponse.data.result) {
                tokensResponse.data.result.forEach((tx: any) => {
                    uniqueTokens.add(tx.contractAddress);
                });
            }

            const tokenBalances: TokenBalance[] = [{
                symbol: network.symbol,
                name: network.name,
                balance: nativeBalanceFormatted,
                address: 'native',
                decimals: 18,
                network: networkId,
                networkName: network.name
            }];

            for (const tokenAddress of uniqueTokens) {
                try {
                    if (!(await this.isValidContract(provider, tokenAddress))) {
                        continue;
                    }

                    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

                    if (!(await this.isERC20Contract(contract))) {
                        continue;
                    }

                    const [balance, decimals, symbol, name] = await Promise.all([
                        contract.balanceOf(walletAddress).catch(() => null),
                        contract.decimals().catch(() => null),
                        contract.symbol().catch(() => null),
                        contract.name().catch(() => null)
                    ]);

                    if (!balance || decimals === null || !symbol || !name) {
                        continue;
                    }

                    const formattedBalance = ethers.formatUnits(balance, decimals);
                    
                    if (!(await this.isLegitToken(contract, formattedBalance, symbol, name))) {
                        continue;
                    }

                    if (parseFloat(formattedBalance) > 0) {
                        tokenBalances.push({
                            symbol: String(symbol),
                            name: String(name),
                            balance: formattedBalance,
                            address: tokenAddress,
                            decimals: Number(decimals),
                            network: networkId,
                            networkName: network.name
                        });
                    }
                } catch (error) {
                    console.error(`Skipping token ${tokenAddress} on ${networkId}: ${error}`);
                    continue;
                }
            }

            return tokenBalances;
        } catch (error) {
            console.error(`Error scanning ${networkId} network:`, error);
            return [];
        }
    }

    async getAllTokenBalances(): Promise<TokenBalance[]> {
        await this.ensureNetworksInitialized();
        
        const allBalances: TokenBalance[] = [];
        const networks = Object.keys(this.networks);

        const promises = networks.map(async networkId => {
            try {
                return await this.getTokenBalancesForNetwork(networkId);
            } catch (error) {
                console.error(`Error getting balances for ${networkId}:`, error);
                return [];
            }
        });

        const results = await Promise.all(promises);
        results.forEach(networkBalances => {
            allBalances.push(...networkBalances);
        });

        return allBalances;
    }

    private async getTokenIdMap(): Promise<{ [symbol: string]: string }> {
        if (this.tokenIdMapCache) {
            return this.tokenIdMapCache;
        }

        try {
            const popularTokens = {
                'ETH': 'ethereum',              // Ethereum
                'USDT': 'tether',               // Tether
                'USDC': 'usd-coin',             // USD Coin
                'DAI': 'dai',                   // Dai
                'UNI': 'uniswap',               // Uniswap
                'LINK': 'chainlink',            // Chainlink
                'AAVE': 'aave',                 // Aave
                'MATIC': 'matic-network',       // Polygon (Matic)
                'WBTC': 'wrapped-bitcoin',      // Wrapped Bitcoin
                'SUSHI': 'sushiswap',           // SushiSwap
                'COMP': 'compound',             // Compound
                'MKR': 'maker',                 // Maker
                'SNX': 'synthetix-network-token', // Synthetix
                'YFI': 'yearn-finance',         // Yearn Finance
                'BAT': 'basic-attention-token', // Basic Attention Token
                'ZRX': '0x',                    // 0x Protocol
                'CRV': 'curve-dao-token',       // Curve DAO Token
                'BAL': 'balancer',              // Balancer
                '1INCH': '1inch',               // 1inch
                'GRT': 'the-graph',             // The Graph
                'REN': 'ren',                   // Ren
                'RLC': 'iexec-rlc',             // iExec RLC
                'ENJ': 'enjincoin',             // Enjin Coin
                'AMP': 'amp',                   // Amp
                'LRC': 'loopring',              // Loopring
                'OMG': 'omg-network',           // OMG Network
                'BNT': 'bancor',                // Bancor
                'SAND': 'the-sandbox',          // The Sandbox
                'CHZ': 'chiliz',                // Chiliz
                'ANT': 'aragon',                // Aragon
                'AKRO': 'akropolis',            // Akropolis
                'OCEAN': 'ocean-protocol',       // Ocean Protocol
                'BNB': 'binancecoin',  // Убедимся, что это правильный ID для BNB
                'TBNB': 'binancecoin', // Добавим маппинг для тестового BNB
                'tBNB': 'binancecoin',
              };
            this.tokenIdMapCache = popularTokens;
            return popularTokens;
        } catch (error) {
            console.error('Error getting token ID map:', error);
            return {};
        }
    }

    private async getTokenImage(symbol: string, isNativeToken: boolean, networkId: string): Promise<string | undefined> {
        const cacheKey = isNativeToken ? `native-${networkId}` : symbol;
        
        if (this.tokenImageCache[cacheKey]) {
            return this.tokenImageCache[cacheKey];
        }

        try {
            if (isNativeToken) {
                const network = this.networks[networkId];
                if (network.imageUrl) {
                    this.tokenImageCache[cacheKey] = network.imageUrl;
                    return network.imageUrl;
                }
            }

            const idMap = await this.getTokenIdMap();
            const tokenId = idMap[symbol.toUpperCase()];
            if (tokenId) {
                const response = await this.retryRequest(() =>
                    axios.get(`${COINGECKO_BASE_URL}/coins/${tokenId}`)
                );
                const imageUrl = response.data.image.small;
                this.tokenImageCache[cacheKey] = imageUrl;
                return imageUrl;
            }
        } catch (error) {
            console.error(`Error getting image for token ${symbol}:`, error);
        }
        return undefined;
    }


    async getTokenPrices(tokenBalances: TokenBalance[]): Promise<{ [key: string]: number }> {
        try {
            const symbols = [...new Set(tokenBalances.map(token => {
                // Нормализуем символы для всех сетей
                switch(token.network) {
                    case 'bscTestnet':
                        return 'BNB';
                    case 'sepolia':
                        return 'ETH';
                    default:
                        return token.symbol;
                }
            }))];
            
            const idMap = await this.getTokenIdMap();
            const prices: { [key: string]: number } = {};

            for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
                const symbolsChunk = symbols.slice(i, i + CHUNK_SIZE);
                const tokenIds = symbolsChunk
                    .map(symbol => idMap[symbol.toUpperCase()])
                    .filter(id => id)
                    .join(',');

                if (!tokenIds) continue;

                try {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    
                    const response = await axios.get(`${COINGECKO_BASE_URL}/simple/price`, {
                        params: {
                            ids: tokenIds,
                            vs_currencies: 'usd'
                        }
                    });

                    for (const symbol of symbolsChunk) {
                        const id = idMap[symbol.toUpperCase()];
                        if (id && response.data[id]) {
                            const price = response.data[id].usd;
                            // Сохраняем цену для всех вариантов символа
                            prices[symbol] = price;
                            
                            // Для BNB сохраняем цену под всеми возможными символами
                            if (symbol === 'BNB') {
                                prices['BNB'] = price;
                                prices['tBNB'] = price;
                                prices['TBNB'] = price;
                            }
                            
                            // Для ETH сохраняем цену под всеми возможными символами
                            if (symbol === 'ETH') {
                                prices['ETH'] = price;
                                prices['sepETH'] = price;
                                prices['SEPOLIA'] = price;
                            }
                        }
                    }
                } catch (error: any) {
                    if (error.response?.status === 429) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 2));
                        i -= CHUNK_SIZE;
                        continue;
                    }
                    console.error(`Error fetching prices for chunk ${i}:`, error);
                }
            }

            return prices;
        } catch (error) {
            console.error('Error getting token prices:', error);
            return {};
        }
    }

    async getEnrichedTokenBalances(): Promise<TokenBalance[]> {
        await this.ensureNetworksInitialized();
        
        const balances = await this.getAllTokenBalances();
        const prices = await this.getTokenPrices(balances);

        const enrichedTokens = await Promise.all(
            balances.map(async (token) => {
                const isNativeToken = token.address === 'native';
                const imageUrl = await this.getTokenImage(token.symbol, isNativeToken, token.network);
                return {
                    ...token,
                    networkName: this.networks[token.network].name,
                    price: prices[token.symbol] || 0,
                    imageUrl,
                    networkImageUrl: this.networks[token.network].imageUrl
                };
            })
        );

        return enrichedTokens;
    }

    private async ensureNetworksInitialized(): Promise<void> {
        if (Object.keys(this.providers).length === 0) {
            await this.initializeNetworks();
        }
    }
}