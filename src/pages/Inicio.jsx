import React from 'react';
import { Link } from 'react-router-dom';

export default function Inicio() {
  return (
    <div className="tela tela-inicio">
      <h1>Escolha o modo deste aparelho</h1>
      <p>Cada celular tem uma função durante o culto.</p>
      <div className="botoes-modo">
        <Link className="botao botao-primario" to="/recepcao">
          📋 Recepção
          <span>Digitar e confirmar visitantes na porta</span>
        </Link>
        <Link className="botao botao-secundario" to="/apresentacao">
          📺 Apresentação
          <span>Exibir a lista organizada para o culto</span>
        </Link>
      </div>
    </div>
  );
}
