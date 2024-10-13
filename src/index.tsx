import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom'; // Используем HashRouter
import Home from './Home';
import Login from './login';
import Create from './create';
import Test from './test';
import HomeBalance from './homeBalance';
import Settings from './settings';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create" element={<Create />} />
        <Route path="/test" element={<Test />} />
        <Route path="/HomeBalance" element={<HomeBalance />} />
        <Route path="/Settings" element={<Settings />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
