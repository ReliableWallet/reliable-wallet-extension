import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message } from 'antd';
import { ethers } from 'ethers';

import './css/login.css';

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

        message.success('Успешный вход в Ethereum кошелек!');

        localStorage.setItem('walletAvatar', "");


        navigate('/homeBalance');  // Перенаправляем на страницу homeBalance
      } catch (error) {
        throw new Error('Неверная мнемоническая фраза для Ethereum');
      }
    } catch (error) {
      console.error('Error during login:', error);
      message.error(error.message || 'Произошла ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <h1>Вход в кошелек</h1>
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
  );
};

export default Login;