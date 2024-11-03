import React, { useState, useEffect } from 'react';
import { Input, Select, Button, message } from 'antd';
import { ethers, JsonRpcProvider } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { TokenBalance } from '../libs/types';
import { FaArrowLeftLong } from 'react-icons/fa6';
import IconButton from '../libs/IconButton';

const SwapToken: React.FC = () => {
  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0');
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const navigate = useNavigate();

  // Загружаем данные из localStorage при монтировании
  useEffect(() => {
    const savedTokens = localStorage.getItem('tokens');
    const savedWallet = localStorage.getItem('wallet');
    const savedProvider = localStorage.getItem('provider');

    if (savedTokens) {
      setTokens(JSON.parse(savedTokens));
    }

    if (savedWallet && savedProvider) {
      const walletData = JSON.parse(savedWallet);
      const newProvider = new JsonRpcProvider(savedProvider);
      const newWallet = new ethers.Wallet(walletData.privateKey, newProvider);
      setWallet(newWallet);
    }
  }, []);

  const handleSwap = async () => {
    if (!wallet || !fromToken || !toToken || !amount) {
      message.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      // Здесь будет интеграция с DEX
      message.success('Swap executed successfully!');
      navigate('/home');
    } catch (error: any) {
      message.error(error.message || 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
      <IconButton className="back-icon" style={{}} icon={<FaArrowLeftLong style={{ fill: 'pink' }} size={24} />} onClick={() => navigate(-1)} />

        <h1>Swap Tokens</h1>
      </header>

      <div className="body">
        <div className="content">
          <div className="space-y-4">
            <Select
              className="w-full"
              placeholder="From token"
              onChange={value => setFromToken(value.split('-')[0])}
            >
              {tokens.map(token => (
                <Select.Option 
                  key={`from-${token.network}-${token.symbol}-${token.address}`} 
                  value={`${token.symbol}-${token.network}`}
                >
                  {`${token.symbol} - Balance: ${token.balance}`}
                </Select.Option>
              ))}
            </Select>

            <Input
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />

            <Select
              className="w-full"
              placeholder="To token"
              onChange={value => setToToken(value.split('-')[0])}
            >
              {tokens.map(token => (
                <Select.Option 
                  key={`to-${token.network}-${token.symbol}-${token.address}`} 
                  value={`${token.symbol}-${token.network}`}
                >
                  {token.symbol}
                </Select.Option>
              ))}
            </Select>

            <div>Estimated output: {estimatedOutput}</div>

            <Button
              type="primary"
              loading={loading}
              onClick={handleSwap}
              block
            >
              Swap
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapToken; 