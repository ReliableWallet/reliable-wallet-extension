import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Alert, Button, Avatar } from 'antd';
import { ethers, Wallet, WebSocketProvider } from "ethers";
import blockies from 'ethereum-blockies';
import * as bip39 from "bip39";
import IconButton from './libs/IconButton';
import { FaGear } from "react-icons/fa6";
import { CopyFilled, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';


import './css/homeBalance.css';

const { Title, Text } = Typography;

// WebSocket провайдер для подключения к сети Ethereum (Sepolia)
const provider = new WebSocketProvider("wss://ethereum-sepolia-rpc.publicnode.com");
// const provider = new WebSocketProvider("https://data-seed-prebsc-1-s1.bnbchain.org:8545");

const WalletInfo: React.FC = () => {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [ShortAddress, setShortAddress] = useState<string | null>(null);
  const [balanceETH, setBalanceETH] = useState<string | null>(null);
  const [balanceUSD, setBalanceUSD] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);


  const navigate = useNavigate();

  const textStyles = {
    color: 'rgba(255, 255, 255)',
  }

  // Функция для получения приватного ключа из мнемонической фразы
  async function getPrivateKeyFromMnemonic(mnemonic: string) {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    const wallet = Wallet.fromPhrase(mnemonic);
    return wallet.privateKey;
  }

  // Функция для получения адреса из приватного ключа
  async function getAddressFromPrivateKey(privateKey: string) {
    const wallet = new Wallet(privateKey);
    setAddress(wallet.address);
    return wallet.address;
  }

  async function shortenAddress(address: string, startLength = 6, endLength = 4): Promise<string> {
    if (address.length <= startLength + endLength) {
      return address; // Если длина адреса меньше или равна необходимой длине, вернуть его без изменений
    }
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
  }

  async function getAvatarFromAddress(address: string): Promise<string> {
    let avatarUrl = "";

    // Генерация аватарки и проверка длины ссылки
    while (avatarUrl.length < 240) {
      const avatar = blockies.create({ seed: address, size: 8, scale: 5 }); // Настройки аватара
      avatarUrl = avatar.toDataURL(); // Преобразование Canvas в Data URL

      // console.log("Generated avatar URL:", avatarUrl);
    }

    return avatarUrl;
  }

  // Функция для получения цены ETH из CryptoCompare
  async function getETHPrice() {
    try {
      const response = await axios.get(
        'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD'
      );
      return response.data.USD;
    } catch (error) {
      console.error("Ошибка при получении курса ETH:", error);
      throw error;
    }
  }

  // Функция для проверки баланса ETH
  async function checkBalance() {
    setLoading(true);
    try {
      if (!mnemonic) {
        throw new Error("Мнемоническая фраза не найдена");
      }

      // Получаем приватный ключ из мнемонической фразы
      const privateKey = await getPrivateKeyFromMnemonic(mnemonic);
      localStorage.setItem('walletPrivateKey', privateKey);

      setPrivateKey(privateKey);

      // Создаем кошелек с провайдером
      const wallet = new ethers.Wallet(privateKey, provider);

      // Получаем баланс ETH
      const balance = await provider.getBalance(wallet.address);
      const balanceInEth = ethers.formatEther(balance);
      setBalanceETH(balanceInEth);

      // Получаем цену ETH в USD
      const ethPrice = await getETHPrice();
      const balanceInUsd = (parseFloat(balanceInEth) * ethPrice).toFixed(2);
      setBalanceUSD(balanceInUsd);
    } catch (error) {
      console.error("Ошибка при проверке баланса:", error);
      // Добавьте здесь обработку ошибки, например, отображение сообщения пользователю
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(address);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
  
  async function getMnemonic() {
    const mnemonic = localStorage.getItem('walletMnemonic');
    if (mnemonic) {
      setMnemonic(mnemonic);
    }
  }

  // mnemonic
  useEffect(() => {
    // Получаем мнемоническую фразу из localStorage при монтировании компонента
    const storedMnemonic = localStorage.getItem('walletMnemonic');
    if (storedMnemonic) {
      setMnemonic(storedMnemonic);
    }
  }, []);


  // privateKey
  useEffect(() => {
    if (mnemonic) {
      getPrivateKeyFromMnemonic(mnemonic)
        .then(privateKey => {
          // Сохраняем приватный ключ в localStorage
          localStorage.setItem('walletPrivateKey', privateKey);

          // Устанавливаем адрес (или приватный ключ) в состояние компонента
          setPrivateKey(privateKey);
        })
        .catch(error => {
          console.error("Error getting private key:", error);
        });
    }
  }, [mnemonic]);

  // balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (mnemonic) {
        await checkBalance();
      }
    };
    fetchBalance();
  });

  // address
  useEffect(() => {
    if (privateKey) {
      getAddressFromPrivateKey(privateKey).then(address => {
        setAddress(address)
        localStorage.setItem('walletAddress', address);
      });
    }
  }, [privateKey]);

  // short addres
  useEffect(() => {
    if (address) {
      shortenAddress(address).then(ShortAddress => setShortAddress(ShortAddress));
    }
  }, [address]);


  // avatar
  useEffect(() => {
    // Попытка получить аватарку из localStorage при загрузке страницы

    const savedAvatar = localStorage.getItem('walletAvatar');
    if (savedAvatar && savedAvatar && savedAvatar.length > 240) {
      setAvatarImage(savedAvatar);
    } else if (address) {
      console.log("ahuets")
      // Если аватарки в localStorage нет, генерируем новую
      getAvatarFromAddress(address).then(avatarUrl => {
        localStorage.setItem('walletAvatar', avatarUrl); // Сохраняем аватар в localStorage
        setAvatarImage(avatarUrl); // Обновляем состояние компонента
      });
    }
  }, [address]);

  const SettingsButton = () => {
    navigate('/settings')
  }

  const QrButton = () => {
    navigate('/QrCode')
  }

  return (
    <div className='container'>

      <header className='header'>
        <button className='shortAddress-button defaultButton' onClick={copyToClipboard}> <CopyFilled className='copy-icon' twoToneColor={'pink'}/> {ShortAddress}</button>


        <IconButton
          icon={FaGear}
          onClick={SettingsButton}
          color="pink"
          size={24}
          className='settings-icon'
        />
      </header>

      

      <div className='body'>
        <div className="content">
          <div className="info-home">
          
          {avatarImage && <img className='avatar' src={avatarImage} alt="Avatar" />}
          

          {balanceETH !== null && (
            <span className='balance-home'>${balanceUSD}</span>
          )}
          

          <Button
            type="default"
            onClick={checkBalance}
            loading={loading}
            variant='filled'
            className='checkBalanceButton-home'
            icon={<ReloadOutlined />}
          ></Button>
          </div>

          <Button
          type='default'
          onClick={QrButton}
          className='qrButton-home'
          icon={<QrcodeOutlined />}></Button>


        </div>
      </div>
    </div>
  );
};

export default WalletInfo;