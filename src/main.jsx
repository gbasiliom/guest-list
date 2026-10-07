import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Recepcao from './pages/Recepcao.jsx';
import Apresentacao from './pages/Apresentacao.jsx';
import Inicio from './pages/Inicio.jsx';
import Layout from './components/Layout.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/recepcao" element={<Recepcao />} />
          <Route path="/apresentacao" element={<Apresentacao />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
