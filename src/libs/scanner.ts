import { ethers } from 'ethers';
import axios from 'axios';
import { NETWORKS, ERC20_ABI } from './constants';
import { TokenBalance, Networks } from './types';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const RETRY_DELAY = 2000;
const MAX_RETRIES = 5;
const CHUNK_SIZE = 50; 

export class MultiChainWalletScanner {
    private privateKey: string;
    private providers: { [key: string]: ethers.WebSocketProvider };
    private wallets: { [key: string]: ethers.Wallet };
    private networks: Networks;
    private tokenIdMapCache: { [symbol: string]: string } | null = null;
    private lastApiCall: number = 0;
    private tokenImageCache: { [symbol: string]: string } = {};


    constructor(
        privateKey: string,
        networks: Networks = NETWORKS
    ) {
        this.privateKey = privateKey;
        this.networks = networks;
        this.providers = {};
        this.wallets = {};
        
        this.initializeNetworks();
    }
    private initializeNetworks(): void {
        for (const [networkId, network] of Object.entries(this.networks)) {
            try {
                const provider = new ethers.WebSocketProvider(network.rpc);
                const wallet = new ethers.Wallet(this.privateKey, provider);
                
                this.providers[networkId] = provider;
                this.wallets[networkId] = wallet;
            } catch (error) {
                console.error(`Error initializing network ${networkId}:`, error);
            }
        }
    }

    // Вспомогательная функция для соблюдения rate limit
    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < RETRY_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY - timeSinceLastCall));
        }
        this.lastApiCall = Date.now();
    }

    // Функция для повторных попыток запроса с обработкой ошибок
    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        retries: number = MAX_RETRIES
    ): Promise<T> {
        try {
            await this.waitForRateLimit();
            return await requestFn();
        } catch (error: any) {
            if (retries > 0 && error.response?.status === 429) {
                // Если превышен лимит запросов, ждем и пробуем снова
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return this.retryRequest(requestFn, retries - 1);
            }
            throw error;
        }
    }

    async getTokenBalancesForNetwork(networkId: string): Promise<TokenBalance[]> {
        const network = this.networks[networkId];
        const wallet = this.wallets[networkId];
        const provider = this.providers[networkId];

        if (!wallet || !provider) {
            throw new Error(`Network ${networkId} not initialized`);
        }

        try {
            const walletAddress = wallet.address;

            // Получаем баланс нативного токена
            const nativeBalance = await provider.getBalance(walletAddress);
            const nativeBalanceFormatted = ethers.formatEther(nativeBalance);

            // Получаем транзакции токенов из сканера сети
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
                network: networkId
            }];

            for (const tokenAddress of uniqueTokens) {
                try {
                    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
                    const [balance, decimals, symbol, name] = await Promise.all([
                        contract.balanceOf(walletAddress),
                        contract.decimals(),
                        contract.symbol(),
                        contract.name()
                    ]);

                    if (balance && decimals !== undefined) {
                        const formattedBalance = ethers.formatUnits(balance, decimals);
                        if (parseFloat(formattedBalance) > 0) {
                            tokenBalances.push({
                                symbol: String(symbol),
                                name: String(name),
                                balance: formattedBalance,
                                address: tokenAddress,
                                decimals: Number(decimals),
                                network: networkId
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Skipping token ${tokenAddress} on ${networkId}: ${error}`);
                }
            }

            return tokenBalances;
        } catch (error) {
            console.error(`Error scanning ${networkId} network:`, error);
            return [];
        }
    }

    async getAllTokenBalances(): Promise<TokenBalance[]> {
        const allBalances: TokenBalance[] = [];
        const networks = Object.keys(this.networks);

        const promises = networks.map(networkId => 
            this.getTokenBalancesForNetwork(networkId)
                .catch(error => {
                    console.error(`Error getting balances for ${networkId}:`, error);
                    return [];
                })
        );

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
            // Используем локальную базу популярных токенов вместо запроса к API
            const popularTokens = {
                'ETH': 'ethereum',
                'BTC': 'bitcoin',
                'USDT': 'tether',
                'USDC': 'usd-coin',
                'BNB': 'binancecoin',
                'XRP': 'ripple',
                'ADA': 'cardano',
                'DOGE': 'dogecoin',
                'MATIC': 'matic-network',
                'SOL': 'solana',
                'DOT': 'polkadot',
                'DAI': 'dai',
                'UNI': 'uniswap',
                'LINK': 'chainlink',
                'AAVE': 'aave',
                // Добавьте другие популярные токены по необходимости
            };

            this.tokenIdMapCache = popularTokens;
            return popularTokens;
        } catch (error) {
            console.error('Error getting token ID map:', error);
            return {};
        }
    }

    private async getTokenImage(symbol: string): Promise<string | undefined> {
        if (this.tokenImageCache[symbol]) {
            return this.tokenImageCache[symbol];
        }

        try {
            const idMap = await this.getTokenIdMap();
            const tokenId = idMap[symbol.toUpperCase()];
            if (tokenId) {
                const response = await this.retryRequest(() =>
                    axios.get(`${COINGECKO_BASE_URL}/coins/${tokenId}`)
                );
                const imageUrl = response.data.image.small;
                this.tokenImageCache[symbol] = imageUrl;
                return imageUrl;
            }
        } catch (error) {
            console.error(`Error getting image for token ${symbol}:`, error);
        }
        return undefined;
    }


    async getTokenPrices(tokenBalances: TokenBalance[]): Promise<{ [key: string]: number }> {
        try {
            const symbols = [...new Set(tokenBalances.map(token => token.symbol))];
            const idMap = await this.getTokenIdMap();
            
            const prices: { [key: string]: number } = {};
            
            // Разбиваем на меньшие чанки и добавляем больше задержки
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
                            prices[symbol] = response.data[id].usd;
                        }
                    }
                } catch (error: any) {
                    if (error.response?.status === 429) {
                        // При ошибке rate limit ждем дольше
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 2));
                        i -= CHUNK_SIZE; // Повторяем этот же чанк
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
        const balances = await this.getAllTokenBalances();
        const prices = await this.getTokenPrices(balances);

        const enrichedTokens = await Promise.all(
            balances.map(async (token) => {
                const imageUrl = await this.getTokenImage(token.symbol);
                return {
                    ...token,
                    networkName: this.networks[token.network].name,
                    price: prices[token.symbol] || 0,
                    imageUrl
                };
            })
        );

        return enrichedTokens;
    }
}