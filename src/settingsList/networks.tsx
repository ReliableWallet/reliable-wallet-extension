import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Button, Switch, Space, Typography } from 'antd';
import { FaArrowLeftLong } from 'react-icons/fa6';
import IconButton from '../libs/IconButton';
import { MAINNETS, TESTNETS } from '../libs/constants';

const { Option } = Select;
const { Text } = Typography;

const Networks: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [isTestnet, setIsTestnet] = useState<boolean>(false);

  useEffect(() => {
    const storedIsTestnet = localStorage.getItem('isTestnet') === 'true';
    setIsTestnet(storedIsTestnet);
    
    // Get current provider from localStorage
    const storedProvider = localStorage.getItem('userProvider');
    if (storedProvider) {
      setSelectedProvider(storedProvider);
    } else {
      // Set default provider based on network type
      const defaultNetwork = storedIsTestnet ? Object.values(TESTNETS)[0] : Object.values(MAINNETS)[0];
      setSelectedProvider(defaultNetwork.rpc);
    }
  }, []);

  const handleNetworkTypeChange = (checked: boolean) => {
    setIsTestnet(checked);
    // Reset selected provider when switching network type
    const defaultNetwork = checked ? Object.values(TESTNETS)[0] : Object.values(MAINNETS)[0];
    setSelectedProvider(defaultNetwork.rpc);
  };

  const getCurrentNetworks = () => {
    return isTestnet ? TESTNETS : MAINNETS;
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
  };

  const handleSave = () => {
    localStorage.setItem('userProvider', selectedProvider);
    localStorage.setItem('isTestnet', isTestnet.toString());
    localStorage.setItem('networks', JSON.stringify(getCurrentNetworks()));
    navigate(-1);
  };

  return (
    <div className="container">
      <header className="header">
        <IconButton 
          className="back-icon" 
          icon={<FaArrowLeftLong style={{ fill: 'pink' }} size={24} />} 
          onClick={() => navigate(-1)} 
        />
        <h1>Network Settings</h1>
      </header>

      <div className="body">
        <div className="content">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space>
              <Text>Mainnet</Text>
              <Switch 
                checked={isTestnet}
                onChange={handleNetworkTypeChange}
              />
              <Text>Testnet</Text>
            </Space>

            <Select
              value={selectedProvider}
              style={{ width: 300 }}
              onChange={handleProviderChange}
            >
              {Object.entries(getCurrentNetworks()).map(([key, network]) => (
                <Option key={network.rpc} value={network.rpc}>
                  {network.name}
                </Option>
              ))}
            </Select>

            <Button type="primary" onClick={handleSave}>
              Save
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default Networks;
