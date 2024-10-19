import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Button } from 'antd';

const { Option } = Select;

const Networks: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<string>("");

  const providersList = [
    { name: "Ethereum Sepolia", url: "wss://ethereum-sepolia-rpc.publicnode.com" },
    { name: "BSC Testnet", url: "wss://bsc-testnet-rpc.publicnode.com" },
    { name: "BSC Pre-testnet", url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545" },
  ];

  useEffect(() => {
    // Получение текущего провайдера из localStorage или установка Sepolia по умолчанию
    const storedProvider = localStorage.getItem('userProvider');
    setSelectedProvider(storedProvider || 'Ethereum Sepolia');
  }, []);

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
  };

  const handleSave = () => {
    // Найдем URL выбранного провайдера и сохраним его в localStorage
    const selected = providersList.find(p => p.name === selectedProvider);
    if (selected) {
      localStorage.setItem('userProvider', selected.url);
    }
    // Вернемся на главную страницу или другую страницу после выбора
    navigate(-1);
  };

  return (
    <div className="container">
      <h1>Выберите сеть для подключения</h1>
      <Select
        value={selectedProvider}
        style={{ width: 300 }}
        onChange={handleProviderChange}
      >
        {providersList.map((provider) => (
          <Option key={provider.url} value={provider.name}>
            {provider.name}
          </Option>
        ))}
      </Select>
      <div style={{ marginTop: 20 }}>
        <Button type="primary" onClick={handleSave}>
          Сохранить
        </Button>
      </div>
    </div>
  );
};

export default Networks;
