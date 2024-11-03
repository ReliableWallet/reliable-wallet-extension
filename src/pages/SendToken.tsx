import React, { useState, useEffect } from 'react';
import { Input, Select, Button, message } from 'antd';
import { ethers, JsonRpcProvider, formatUnits } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { ERC20_ABI } from '../libs/constants';
import { TokenBalance } from '../libs/types';
import { FaArrowLeftLong } from 'react-icons/fa6';
import IconButton from '../libs/IconButton';

const SendToken: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const [provider, setProvider] = useState<JsonRpcProvider | null>(null);
  const [gasInfo, setGasInfo] = useState<{
    gasPrice: string;
    estimatedGas: string;
    totalGasCost: string;
    nativeBalance: string;
  }>({
    gasPrice: '0',
    estimatedGas: '0',
    totalGasCost: '0',
    nativeBalance: '0'
  });
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
      setProvider(newProvider);
    }
  }, []);

  // Функция для обновления информации о газе
  const updateGasInfo = async () => {
    if (!wallet || !provider || !amount || !recipient || !selectedToken) return;

    try {
      const feeData = await provider.getFeeData();
      const nativeBalance = await provider.getBalance(wallet.address);
      const tokenSymbol = selectedToken.split('-')[0];
      const token = tokens.find(t => t.symbol === tokenSymbol);

      if (!token) return;

      let estimatedGas;
      if (token.address === 'native') {
        estimatedGas = BigInt(21000); // Стандартный газ для ETH транзакций
      } else {
        const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
        try {
          estimatedGas = await contract.transfer.estimateGas(
            recipient,
            ethers.parseUnits(amount, token.decimals)
          );
        } catch {
          estimatedGas = BigInt(65000); // Примерный газ для ERC20 транзакций
        }
      }

      const gasCost = feeData.gasPrice * estimatedGas;

      setGasInfo({
        gasPrice: formatUnits(feeData.gasPrice, 'gwei'),
        estimatedGas: estimatedGas.toString(),
        totalGasCost: formatUnits(gasCost, 'ether'),
        nativeBalance: formatUnits(nativeBalance, 'ether')
      });
    } catch (error) {
      console.error('Error updating gas info:', error);
    }
  };

  // Обновляем информацию о газе при изменении входных данных
  useEffect(() => {
    updateGasInfo();
  }, [amount, recipient, selectedToken, wallet, provider]);

  const handleSend = async () => {
    if (!wallet || !provider || !recipient || !amount) {
      message.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const tokenSymbol = selectedToken.split('-')[0];
      const token = tokens.find(t => t.symbol === tokenSymbol);

      if (!token) {
        message.error('Token not found');
        return;
      }

      const balance = parseFloat(token.balance);
      const sendAmount = parseFloat(amount);
      if (balance < sendAmount) {
        message.error('Insufficient token balance');
        return;
      }

      const feeData = await provider.getFeeData();
      const nativeBalance = await provider.getBalance(wallet.address);

      let tx;
      if (token.address === 'native') {
        const gasLimit = 21000; // Стандартный лимит для ETH транзакций
        const gasCost = feeData.gasPrice * BigInt(gasLimit);
        const totalCost = gasCost + ethers.parseEther(amount);

        if (nativeBalance < totalCost) {
          message.error('Insufficient funds for gas + value');
          return;
        }

        tx = await wallet.sendTransaction({
          to: recipient,
          value: ethers.parseEther(amount),
          gasLimit: gasLimit,
          gasPrice: feeData.gasPrice
        });
      } else {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
          if (typeof contract.transfer !== 'function') {
            message.error('Invalid token contract');
            return;
          }

          const gasLimit = await contract.transfer.estimateGas(
            recipient,
            ethers.parseUnits(amount, token.decimals)
          );
          const gasCost = feeData.gasPrice * gasLimit;

          if (nativeBalance < gasCost) {
            message.error(`Insufficient ${token.networkName} native token for gas`);
            return;
          }

          tx = await contract.transfer(
            recipient,
            ethers.parseUnits(amount, token.decimals),
            {
              gasLimit: gasLimit,
              gasPrice: feeData.gasPrice
            }
          );
        } catch (error) {
          console.error('Contract error:', error);
          message.error('Error interacting with token contract');
          return;
        }
      }

      await tx.wait();
      message.success('Transaction sent successfully!');
      navigate(-1);
    } catch (error: any) {
      console.error('Transaction error:', error);
      message.error(error.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  // Получаем название нативного токена сети
  const getNativeTokenSymbol = (tokenNetwork: string) => {
    if (tokenNetwork.includes('bsc')) return 'BNB';
    if (tokenNetwork.includes('arbitrum')) return 'ETH';
    return 'ETH';
  };

  return (
    <div className="container">
      <header className="header">
        <IconButton 
          className="back-icon" 
          style={{}} 
          icon={<FaArrowLeftLong style={{ fill: 'pink' }} size={24} />} 
          onClick={() => navigate(-1)} 
        />
        <h1>Send Token</h1>
      </header>

      <div className="body">
        <div className="content">
          <div className="space-y-4">
            <Select
              className="w-full"
              placeholder="Select token"
              onChange={value => setSelectedToken(value)}
            >
              {tokens.map(token => (
                <Select.Option 
                  key={`${token.network}-${token.symbol}-${token.address}`} 
                  value={`${token.symbol}-${token.network}`}
                >
                  {`${token.symbol} - Balance: ${token.balance}`}
                </Select.Option>
              ))}
            </Select>

            <Input
              placeholder="Recipient address"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            />

            <Input
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />

            {/* Информация о газе */}
            <div className="gas-info" style={{ marginTop: '20px', color: 'white' }}>
              <h3>Transaction Fee Info:</h3>
              <div style={{ marginLeft: '10px' }}>
                <p>Gas Price: {gasInfo.gasPrice} Gwei</p>
                <p>Estimated Gas: {gasInfo.estimatedGas} units</p>
                <p>Total Gas Cost: {gasInfo.totalGasCost} {selectedToken ? getNativeTokenSymbol(selectedToken.split('-')[1]) : 'ETH'}</p>
                <p>Available for Gas: {gasInfo.nativeBalance} {selectedToken ? getNativeTokenSymbol(selectedToken.split('-')[1]) : 'ETH'}</p>
                <p style={{ color: 'pink', fontSize: '12px' }}>
                  * Gas fees are paid in network's native token ({selectedToken ? getNativeTokenSymbol(selectedToken.split('-')[1]) : 'ETH'})
                </p>
              </div>
            </div>

            <Button
              type="primary"
              loading={loading}
              onClick={handleSend}
              block
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendToken; 