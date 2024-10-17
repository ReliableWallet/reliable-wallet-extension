import React, { useEffect, useState } from 'react';
import AdvancedQRCode from './libs/QRCodeGenerator';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong } from 'react-icons/fa6';
import IconButton from './libs/IconButton';
import { Button } from 'antd';

import "./css/qrcode.css";
import { CopyOutlined } from '@ant-design/icons';

const QrCode: React.FC = () => {
    const logo = require('./img/icon.webp');
    const [walletAddress, setWalletAddress] = useState('');
    const [avatarImage, setAvatarImage] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        setWalletAddress(localStorage.getItem('walletAddress'));

    }, []);


    useEffect(() => {
        setAvatarImage(localStorage.getItem('walletAvatar'));
    })

    return (
        <div className='container'>
            <header className="header">
                <IconButton className="back-icon" style={{}} icon={<FaArrowLeftLong style={{ fill: 'pink' }} size={24} />} onClick={() => navigate(-1)} />

                <span>Recive</span>

                {avatarImage && <img className='avatar-qrcode' src={avatarImage} alt="Avatar" />}
            </header>

            <div className="body">
                <div className="content">
                    <AdvancedQRCode
                        value={walletAddress}
                        logoUrl={logo}
                        logoPaddingStyle="square"
                        size={180}
                        bgColor="white"
                        fgColor="black"
                        qrStyle="dots"
                        eyeRadius={2}
                        eyeColor="balck"
                        style={{
                            borderRadius: '20px',
                        }}
                    />
                    <div className="addressCopy-qrcode">
                        <span className='address-qrcode'>{walletAddress}</span>
                        <Button
                            className='copyButton-qrcode defaultButton'
                            onClick={() => navigator.clipboard.writeText(walletAddress)}
                            icon={<CopyOutlined style={{ fill: 'pink' }} size={24} />}
                        >Copy Address</Button>
                    </div>
                </div>
            </div>
            {/* <input type="address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} /> */}
        </div>
    );
};

export default QrCode;