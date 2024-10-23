import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Alert, Button, Avatar, message } from 'antd';
import { ethers, Wallet, WebSocketProvider } from "ethers";
import blockies from 'ethereum-blockies';
import * as bip39 from "bip39";
import IconButton from './libs/IconButton';
import { FaGear } from "react-icons/fa6";
import { CopyFilled, DislikeOutlined, QrcodeOutlined, ReloadOutlined, RetweetOutlined } from '@ant-design/icons';
import axios from 'axios';

import { ReactComponent as IconETH } from './img/Network.svg';

import './css/homeBalance.css';

const { Title, Text } = Typography;

// WebSocket провайдер для подключения к сети Ethereum (Sepolia)
// const provider = new WebSocketProvider("wss://ethereum-sepolia-rpc.publicnode.com");
// const provider = new WebSocketProvider("wss://bsc-testnet-rpc.publicnode.com");
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
  const [provider, setProvider] = useState<WebSocketProvider | null>(null);
  const [activeTab, setActiveTab] = useState('tokens');

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


  // Функция для получения и установки провайдера из localStorage
  const setUserProviderFromLocalStorage = () => {
    const storedProvider = localStorage.getItem('userProvider');
    const defaultProvider = "wss://ethereum-sepolia-rpc.publicnode.com"; // Sepolia по умолчанию
    const providerUrl = storedProvider || defaultProvider;
    const newProvider = new WebSocketProvider(providerUrl);
    setProvider(newProvider);
  };

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

  // Функция для копирования адреса
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

  // Функция для рендера контента в зависимости от выбранной вкладки
  const renderContent = () => {
    switch (activeTab) {
      case 'tokens':
        return <div className="sectionTokens-home">
          <div className="token">
            <div className="IconName-home">
              <IconETH width={35} height={35} /> 
              <span>Ethereum</span>
            </div>
            
            <span className='toketBalance-home'>{balanceETH} ETH</span>
          </div>

        </div>;
      case 'nfts':
        return <div className="sectionTokens-home">Content for NFT's</div>;
      case 'history':
        return <div className="sectionTokens-home">Transaction History</div>;
      default:
        return <div className="sectionTokens-home">Soon...</div>;
    }
  };


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

  useEffect(() => {
    // Установка провайдера при монтировании компонента
    setUserProviderFromLocalStorage();
  }, []);

  // balance
  // useEffect(() => {
  //   const fetchBalance = async () => {
  //     if (mnemonic) {
  //       await checkBalance();
  //     }
  //   };
  //   fetchBalance();
  // });
  useEffect(() => {
    if (mnemonic && provider) {
      checkBalance();
    }
  }, [mnemonic, provider]);

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

  useEffect(() => {
    message.config({
      getContainer: () => document.querySelector('.message-container') || document.body,
    });
  }, []);

  const SettingsButton = () => {
    navigate('/settings')
  }

  const QrButton = () => {
    navigate('/QrCode')
  }

  return (
    <div className='container'>

      <header className='header'>
        <button className='shortAddress-button defaultButton' onClick={copyToClipboard}> <CopyFilled className='copy-icon' twoToneColor={'pink'} /> {ShortAddress}</button>


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
          <div className="message-container"></div>

          <div className="column-home">
            <div className="info-home">
              <div className="important-home">
                {avatarImage && <img className='avatar' src={avatarImage} alt="Avatar" />}


                {balanceETH !== null && (
                  <span className='balance-home'>${balanceUSD}</span>
                )}


                <Button
                  type="default"
                  onClick={checkBalance}
                  loading={loading}
                  variant='filled'
                  className='checkBalanceButton-home button-home'
                  icon={<ReloadOutlined />}
                ></Button>
              </div>

              <div className="buttonNav-home">
              <Button
                  type='default'
                  size='large'
                  onClick={QrButton}
                  className='qrButton-home button-home'
                  icon={<DislikeOutlined />}>
                </Button>
                <Button
                  type='default'
                  size='large'
                  onClick={QrButton}
                  className='qrButton-home button-home'
                  icon={<QrcodeOutlined />}>
                </Button>
                <Button
                  type='default'
                  size='large'
                  onClick={QrButton}
                  className='qrButton-home button-home'
                  icon={<RetweetOutlined />}>
                Swap</Button>
              </div>
            </div>
            <div className="sectionBalance-home">

              <Button className='balanceButton-home'
                onClick={() => setActiveTab('tokens')}
              >TOKENS</Button>
              <Button className='balanceButton-home'
                onClick={() => setActiveTab('nfts')}
              >NFT's</Button>
              <Button className='balanceButton-home'
                onClick={() => setActiveTab('history')}
              >History</Button>

            </div>


            {renderContent()}
            {/* <div className='sectionTokens-home'>
              {renderContent()}
            </div> */}

          </div>

        </div>
      </div>
    </div>
  );
};

export default WalletInfo;