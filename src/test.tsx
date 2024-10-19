import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Select } from 'antd';
import { ethers, Wallet, WebSocketProvider } from "ethers";
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const WalletInfo: React.FC = () => {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [ShortAddress, setShortAddress] = useState<string | null>(null);
  const [balanceETH, setBalanceETH] = useState<string | null>(null);
  const [balanceUSD, setBalanceUSD] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [provider, setProvider] = useState<WebSocketProvider | null>(null); // Хранение провайдера
  const [selectedProvider, setSelectedProvider] = useState<string>(""); // Выбранный провайдер

  const providersList = [
    { name: "Ethereum Sepolia", url: "wss://ethereum-sepolia-rpc.publicnode.com" },
    { name: "BSC Testnet", url: "wss://bsc-testnet-rpc.publicnode.com" },
    { name: "BSC Pre-testnet", url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545" },
  ];

  const navigate = useNavigate();

  // Функция для установки провайдера на основе выбора
  const handleProviderChange = (value: string) => {
    const selected = providersList.find(p => p.name === value);
    if (selected) {
      const newProvider = new WebSocketProvider(selected.url);
      setProvider(newProvider);
      setSelectedProvider(selected.name);
    }
  };

  // Функция для проверки баланса ETH
  async function checkBalance() {
    setLoading(true);
    try {
      if (!mnemonic || !provider) {
        throw new Error("Мнемоническая фраза или провайдер не найдены");
      }
      const privateKey = Wallet.fromPhrase(mnemonic).privateKey;
      const wallet = new ethers.Wallet(privateKey, provider);
      const balance = await provider.getBalance(wallet.address);
      const balanceInEth = ethers.formatEther(balance);
      setBalanceETH(balanceInEth);
      const ethPrice = await getETHPrice();
      setBalanceUSD((parseFloat(balanceInEth) * ethPrice).toFixed(2));
    } catch (error) {
      console.error("Ошибка при проверке баланса:", error);
    } finally {
      setLoading(false);
    }
  }

  // Получение цены ETH
  async function getETHPrice() {
    try {
      const response = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD');
      return response.data.USD;
    } catch (error) {
      console.error("Ошибка при получении курса ETH:", error);
      return 0;
    }
  }

  useEffect(() => {
    const storedMnemonic = localStorage.getItem('walletMnemonic');
    if (storedMnemonic) {
      setMnemonic(storedMnemonic);
    }
  }, []);

  useEffect(() => {
    if (mnemonic && selectedProvider) {
      checkBalance();
    }
  }, [mnemonic, provider]);

  return (
    <div className='container'>
      <div className='header'>
        <Title>Выберите провайдера сети</Title>
        <Select
          value={selectedProvider}
          style={{ width: 250 }}
          onChange={handleProviderChange}
        >
          {providersList.map((prov) => (
            <Option key={prov.url} value={prov.name}>
              {prov.name}
            </Option>
          ))}
        </Select>
      </div>

      <div className='body'>
        <div className="content">
          <div className="info-home">
            <div className="important-home">
              {balanceETH !== null && (
                <span className='balance-home'>Баланс: {balanceETH} ETH (${balanceUSD})</span>
              )}
              <Button
                type="default"
                onClick={checkBalance}
                loading={loading}
                className='checkBalanceButton-home'
              >Обновить баланс</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletInfo;
