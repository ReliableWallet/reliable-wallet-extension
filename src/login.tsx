import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message } from 'antd';
import { ethers } from 'ethers';

import './css/login.css';
import { FaArrowLeftLong } from 'react-icons/fa6';
import IconButton from './libs/IconButton';

const { TextArea } = Input;

const Login: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const validateAndLogin = async () => {
    setLoading(true);
    try {
      const words = input.trim().split(/\s+/);
      if (words.length !== 12) {
        throw new Error('Пожалуйста, введите мнемоническую фразу из 12 слов.');
      }

      try {
        const ethereumWallet = ethers.Wallet.fromPhrase(input.trim());
        const mnemonic = input.trim();

        // Сохраняем только мнемоническую фразу в localStorage
        localStorage.setItem('walletMnemonic', mnemonic);

        message.success({
          content: 'Успешный вход в Ethereum кошелек!',
          duration: 1.5,
        });

        localStorage.setItem('walletAvatar', "");


        navigate('/homeBalance');  // Перенаправляем на страницу homeBalance
      } catch (error) {
        throw new Error('Неверная мнемоническая фраза для Ethereum');
      }
    } catch (error) {
      console.error('Error during login:', error);
      message.error({
        content: error.message || 'Произошла ошибка при входе',
        duration: 1.5,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    message.config({
      getContainer: () => document.querySelector('.message-container') || document.body,
    });
  }, []);

  return (
    <div className='container'>
      <header className="header">
        <IconButton className="back-icon" style={{}} icon={<FaArrowLeftLong style={{ fill: 'pink' }} size={24} />} onClick={() => navigate(-1)} />

        <h1>Вход в кошелек</h1>
      </header>

      <div className="body">
        <div className="content">
          <div className="message-container"></div>

          <p>Введите вашу мнемоническую фразу из 12 слов для Ethereum:</p>
          <TextArea
            rows={4}
            value={input}
            onChange={handleInputChange}
            placeholder="Мнемоническая фраза из 12 слов"
            className='input-field'
          />
          <Button
            type="primary"
            onClick={validateAndLogin}
            loading={loading}
            className='login-button'
          >
            Войти
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;