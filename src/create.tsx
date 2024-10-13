import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Row, Col, Input, Alert } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

import './css/create.css';

const Create: React.FC = () => {
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [error, setError] = useState(null);
  const [isButtonClicked, setIsButtonClicked] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [disabledIndexes, setDisabledIndexes] = useState<number[]>([]);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [isAllCorrect, setIsAllCorrect] = useState<boolean>(false);

  const navigate = useNavigate();

  const buttonStyles = {
    background: 'rgba(0, 0, 0, 0.2)',
  }

  const generateWallet = () => {
    setIsButtonClicked(true);

    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "generateWallet" }, function (response) {
        if (response.success) {
          setWalletInfo(response.wallet);
          setError(null);
        } else {
          setError(response.error);
          setWalletInfo(null);
        }
      });
    } else {
      import("./background.js").then((module: typeof import("./background.js")) => {
        module.generateWallet().then((wallet) => {
          if (wallet) {
            setWalletInfo(wallet);
            setError(null);
          } else {
            setWalletInfo(null);
          }
        }).catch((error) => {
          setWalletInfo(null);
        });
      }).catch((error) => {
        setWalletInfo(null);
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletInfo.mnemonic);
      setCopySuccess('Текст скопирован!');
    } catch (err) {
      setCopySuccess('Ошибка при копировании!');
    }
  };

  const MnemonicTest = () => {
    setIsTestMode(true);
    const allIndexes = Array.from({ length: 12 }, (_, i) => i);
    const shuffled = allIndexes.sort(() => 0.5 - Math.random());
    const newDisabledIndexes = shuffled.slice(0, 9);
    setDisabledIndexes(newDisabledIndexes);

    const words = walletInfo.mnemonic.split(" ");
    const newUserInputs = words.map((word, index) =>
      newDisabledIndexes.includes(index) ? word : ''
    );
    setUserInputs(newUserInputs);
  }

  const handleInputChange = (index: number, value: string) => {
    const newUserInputs = [...userInputs];
    newUserInputs[index] = value;
    setUserInputs(newUserInputs);

    const words = walletInfo.mnemonic.split(" ");
    const allCorrect = newUserInputs.every((input, idx) =>
      disabledIndexes.includes(idx) || input.toLowerCase() === words[idx].toLowerCase()
    );
    setIsAllCorrect(allCorrect);
  };

  const handleNextAfterTest = () => {
    localStorage.setItem('walletMnemonic', walletInfo.mnemonic);
    console.log("Test completed successfully!");

    localStorage.setItem('walletAvatar', "");

    navigate("/homeBalance")
  };

  return (
    <div className="container">
      <div className='content-create'>
        <h1 className='h1-wallet-gen'>Create QURWallet</h1>
        {isButtonClicked && (<Alert message="Save that words and dont show for others" className='alert-gen' style={buttonStyles} icon={<ExclamationCircleFilled style={{ color: 'lightgrey' }} />} showIcon />)}
        {!isButtonClicked && (<Button className='customButton customButtonGen' color="default" variant="filled" style={buttonStyles} onClick={generateWallet}>Generate Wallet</Button>)}
      </div>
      {error && <p className="error">Error: {error}</p>}

      {walletInfo && (
        <div className='wallet-info'>
          <p className="p-mnemonic">Mnemonic:</p>
          <PhraseDisplay
            mnemonic={walletInfo.mnemonic}
            disabledIndexes={disabledIndexes}
            userInputs={userInputs}
            handleInputChange={handleInputChange}
            isTestMode={isTestMode}
          />
          {isButtonClicked && !isTestMode && (
            <Button
              className="customButton customButtonCopy"
              color="default"
              variant="filled"
              style={buttonStyles}
              onClick={copyToClipboard}
            >
              Copy
            </Button>
          )}
          {isButtonClicked && !isTestMode && (
            <Button
              className="customButton customButtonNext"
              color="default"
              variant="filled"
              style={{ ...buttonStyles, ...(copySuccess === '' ? { color: 'grey', borderColor: 'grey' } : {}) }}
              disabled={copySuccess === ''}
              onClick={MnemonicTest}
            >
              Next
            </Button>
          )}
          {isTestMode && isAllCorrect && (
            <Button
              className="customButton customButtonNext"
              color="default"
              variant="filled"
              style={buttonStyles}
              onClick={handleNextAfterTest}
            >
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const PhraseDisplay: React.FC<{
  mnemonic: string,
  disabledIndexes: number[],
  userInputs: string[],
  handleInputChange: (index: number, value: string) => void,
  isTestMode: boolean
}> = ({ mnemonic, disabledIndexes, userInputs, handleInputChange, isTestMode }) => {
  const words = mnemonic.split(" ");

  const firstColumnWords = words.slice(0, 6);
  const secondColumnWords = words.slice(6, 12);

  const renderWord = (word: string, index: number) => {
    if (!isTestMode) {
      return (
        <Input value={word} readOnly className="word-input" style={{ width: '50%', marginBottom: '10px', marginLeft: '5px' }} />
      );
    } else if (disabledIndexes.includes(index)) {
      return (
        <Input
          value={word}
          readOnly
          className="word-input"
          style={{ width: '50%', marginBottom: '10px', background: 'lightgrey' }}
        />
      );
    } else {
      const isCorrect = userInputs[index].toLowerCase() === word.toLowerCase();
      const inputStyle = {
        width: '50%',
        marginBottom: '10px',
        borderColor: userInputs[index] ? (isCorrect ? 'green' : 'red') : undefined,
      };

      return (
        <Input
          value={userInputs[index] || ''}
          onChange={(e) => handleInputChange(index, e.target.value)}
          className="word-input"
          style={inputStyle}
        />
      );
    }
  };

  return (
    <Row gutter={16} className='words-mnemonic'>
      <Col span={12} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {firstColumnWords.map((word, index) => (
          <Row key={index} style={{ width: '100%', marginBottom: '0px', alignItems: 'center', justifyContent: 'end' }}>
            <div style={{ width: '30px', textAlign: 'center', marginBottom: '10px' }}>{index + 1}</div>
            {renderWord(word, index)}
          </Row>
        ))}
      </Col>

      <Col span={12} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {secondColumnWords.map((word, index) => (
          <Row key={index + 6} style={{ width: '100%', marginBottom: '0px', alignItems: 'center' }}>
            {renderWord(word, index + 6)}
            <div style={{ width: '30px', textAlign: 'center', marginBottom: '10px' }}>{index + 7}</div>
          </Row>
        ))}
      </Col>
    </Row>
  );
};

export default Create;