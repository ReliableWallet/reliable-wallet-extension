// import React, { useState, useEffect } from 'react';
// import blockies from 'ethereum-blockies';

// import './css/create.css';
// import { Address } from 'ethereumjs-util';

// const Test: React.FC = () => {
//   const [privateKey, setPrivateKey] = useState('');
//   const [avatarImage, setAvatarImage] = useState<string | null>(null);

//   useEffect(() => {
//     if (privateKey) {
//       // Генерация аватара с помощью blockies
//       const avatar = blockies.create({ seed: privateKey, size: 8, scale: 8 }); // Настройки аватара
//       const avatarUrl = avatar.toDataURL(); // Преобразование Canvas в Data URL
//       setAvatarImage(avatarUrl);
//     }
//   }, [privateKey]);

//   return (
//     <div className='container'>
//       <input 
//         type="text" 
//         value={privateKey} 
//         onChange={(e) => setPrivateKey(e.target.value)} 
//         placeholder="Enter your private key"
//       />
//       <img src={avatarImage} alt="Avatar" />
//     </div>
//   );
// };

// export default Test;


import React, { useState } from 'react';
import AdvancedQRCode from './libs/QRCodeGenerator';

const Test: React.FC = () => {
  const logo = require('./img/icon.webp');
  const [walletAddress, setWalletAddress] = useState('');

  return (
    <div className='container' style={{ padding: '0px' }}>
      <h1>QR Code Generator</h1>

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

      <input type="address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
    </div>
  );
};

export default Test;