import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

// Cabecalho verde com abas, no mesmo formato do projeto Acordes de Davi.
export default function Layout() {
  const classe = ({ isActive }) => (isActive ? 'app-aba ativa' : 'app-aba');
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-interno">
          <div className="app-marca">
            <div className="app-logo">GL</div>
            <div>
              <h1>Guest List</h1>
              <p>Lista de convidados — recepção e apresentação</p>
            </div>
          </div>
          <nav className="app-abas">
            <NavLink to="/" end className={classe}>Início</NavLink>
            <NavLink to="/recepcao" className={classe}>Recepção</NavLink>
            <NavLink to="/apresentacao" className={classe}>Apresentação</NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
