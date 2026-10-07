import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getServidorUrl,
  normalizarUrl,
  setServidorUrl,
  limparServidorUrl,
  buscarEstado,
  conectarTempoReal
} from '../core/apiClient.js';
import LeitorQr from '../components/LeitorQr.jsx';
import { tituloExibicao } from '../core/cargos.js';

function LinhaGrupo({ item }) {
  if (item.tipo === 'caravana') {
    return (
      <li className="linha-visitante caravana">
        <span className="etiqueta">{item.etiqueta}</span>
      </li>
    );
  }
  const v = item.visitante;
  const titulo = tituloExibicao(v.cargo);
  return (
    <li className="linha-visitante">
      <span className="etiqueta">
        {titulo ? `${titulo} ${v.nome}` : v.nome} — {v.igreja}, {v.local}
      </span>
    </li>
  );
}

export default function Apresentacao() {
  const [servidorUrl, setServidorUrlLocal] = useState(getServidorUrl());
  const [estado, setEstado] = useState(null);
  const [erroConexao, setErroConexao] = useState('');

  useEffect(() => {
    if (!servidorUrl) return;
    buscarEstado()
      .then((e) => { setEstado(e); setErroConexao(''); })
      .catch((e) => setErroConexao(e.message));
    const desconectar = conectarTempoReal(
      (e) => { setEstado(e); setErroConexao(''); },
      (e) => setErroConexao(e.message)
    );
    return desconectar;
  }, [servidorUrl]);

  function trocarEndereco() {
    limparServidorUrl();
    setServidorUrlLocal('');
    setEstado(null);
    setErroConexao('');
  }

  if (!servidorUrl) {
    return (
      <ConfigurarConexao
        onSalvar={(url) => {
          setServidorUrl(url);
          setServidorUrlLocal(getServidorUrl());
        }}
      />
    );
  }

  if (estado?.expirada) {
    return (
      <div className="tela tela-apresentacao expirada">
        <h1>Sessão encerrada</h1>
        <p>A lista de 10h expirou. Os dados foram apagados por privacidade.</p>
        {estado.resumoFinal && (
          <div className="resumo">
            <p>Total de visitantes: {estado.resumoFinal.totalVisitantes}</p>
            <p>Total de caravanas: {estado.resumoFinal.totalCaravanas}</p>
          </div>
        )}
        <Link to="/">← voltar</Link>
      </div>
    );
  }

  const grupos = estado?.grupos || [];

  return (
    <div className="tela tela-apresentacao">
      <div className="titulo-pagina">
        <h2>Visitantes</h2>
        <button className="botao-link" onClick={trocarEndereco}>Alterar endereço</button>
      </div>
      {erroConexao && (
        <div className="erro">
          <p>Não consegui conectar em {servidorUrl}.</p>
          <p>Confira se este celular está no Wi-Fi do hotspot da Recepção e se o endereço está certo.</p>
          <button onClick={trocarEndereco}>Alterar endereço</button>
        </div>
      )}
      {!estado && !erroConexao && <p className="vazio">Conectando em {servidorUrl}...</p>}
      {estado && grupos.length === 0 && <p className="vazio">Aguardando visitantes...</p>}
      <ul className="lista-apresentacao">
        {grupos.map((item, i) => (
          <LinhaGrupo key={i} item={item} />
        ))}
      </ul>
    </div>
  );
}

function ConfigurarConexao({ onSalvar }) {
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState('');
  const [lendo, setLendo] = useState(false);

  function aoLerQr(texto) {
    setLendo(false);
    var t = String(texto || '').trim();
    if (!/^(https?:\/\/)?\d+\.\d+\.\d+\.\d+(:\d+)?\/?$/.test(t)) {
      setErro('Esse QR não é de uma Recepção. Tente de novo ou digite o endereço.');
      return;
    }
    setErro('');
    onSalvar(t);
  }

  function conectar() {
    if (!/\d+\.\d+\.\d+\.\d+/.test(url)) {
      setErro('Digite o IP completo, por exemplo 192.168.43.1');
      return;
    }
    setErro('');
    onSalvar(url);
  }

  return (
    <div className="tela tela-config">
      {lendo && <LeitorQr onLido={aoLerQr} onFechar={() => setLendo(false)} />}
      <h1>Conectar ao aparelho de Recepção</h1>
      <button onClick={() => setLendo(true)}>Ler QR com a câmera</button>
      <p>Ou informe o endereço mostrado no aparelho que está recebendo os visitantes. Pode digitar só o IP; eu completo o resto.</p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="192.168.43.1"
        inputMode="url"
        autoCapitalize="none"
      />
      {erro && <p className="erro">{erro}</p>}
      <button onClick={conectar}>Conectar</button>
    </div>
  );
}
