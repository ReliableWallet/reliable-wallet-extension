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
    private providers: { [key: string]: ethers.WebSocketProvider };
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
        // Получаем сети из localStorage или используем значение по умолчанию
        const storedNetworks = localStorage.getItem('networks');
        const isTestnet = localStorage.getItem('isTestnet') === 'true';
        
        if (storedNetworks) {
            this.networks = JSON.parse(storedNetworks);
        } else {
            this.networks = isTestnet ? TESTNETS : MAINNETS;
        }
        
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

    private async isValidContract(provider: ethers.WebSocketProvider, address: string): Promise<boolean> {
        try {
            const code = await provider.getCode(address);
            return code !== '0x' && code.length > 2;
        } catch {
            return false;
        }
    }

    private async isERC20Contract(contract: ethers.Contract): Promise<boolean> {
        try {
            // Проверяем основные функции ERC20
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
            // Расширяем список подозрительных паттернов
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

            // Проверяем и символ и имя токена на подозрительные паттерны
            const upperSymbol = symbol.toUpperCase();
            const upperName = name.toUpperCase();
            
            if (suspiciousPatterns.some(pattern => 
                upperSymbol.includes(pattern) || 
                upperName.includes(pattern)
            )) {
                return false;
            }

            // Проверяем баланс - слишком большие числа могут быть подозрительными
            const balanceNumber = parseFloat(balance);
            if (balanceNumber > 10000) { // Уменьшаем порог для тестовых токенов
                return false;
            }

            // Проверяем длину символа - слишком длинные символы подозрительны
            if (symbol.length > 10) {
                return false;
            }

            return true;
        } catch {
            return false;
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
                    // Проверяем, является ли адрес действительным контрактом
                    if (!(await this.isValidContract(provider, tokenAddress))) {
                        continue;
                    }

                    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

                    // Проверяем, соответствует ли контракт стандарту ERC20
                    if (!(await this.isERC20Contract(contract))) {
                        continue;
                    }

                    // Получаем информацию о токене с таймаутом
                    const [balance, decimals, symbol, name] = await Promise.all([
                        contract.balanceOf(walletAddress).catch(() => null),
                        contract.decimals().catch(() => null),
                        contract.symbol().catch(() => null),
                        contract.name().catch(() => null)
                    ]);

                    // Проверяем, что все необходимые данные получены
                    if (!balance || decimals === null || !symbol || !name) {
                        continue;
                    }

                    const formattedBalance = ethers.formatUnits(balance, decimals);
                    
                    // Добавляем проверку на легитимность токена
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
            const popularTokens = {
                'ETH': 'ethereum',
                'BTC': 'bitcoin',
                'USDT': 'tether',
                'USDC': 'usd-coin',
                'BNB': 'binancecoin',
                'tBNB': 'binancecoin', // Добавляем маппинг для тестового BNB
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
                // Расширяем маппинг тестовых токенов на их mainnet аналоги
                switch(token.symbol.toLowerCase()) {
                    case 'tbnb':
                    case 'panbnb':
                        return 'BNB';
                    case 'tsepolia':
                    case 'eth':
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
                            // Устанавливаем цену для оригинального символа и его тестового аналога
                            prices[symbol] = response.data[id].usd;
                            if (symbol === 'BNB') {
                                prices['tBNB'] = response.data[id].usd;
                                prices['panBNB'] = response.data[id].usd;
                            }
                            if (symbol === 'ETH') {
                                prices['tSEPOLIA'] = response.data[id].usd;
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
}