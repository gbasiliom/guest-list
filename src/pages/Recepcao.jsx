import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CARGOS } from '../core/cargos.js';
import {
  getServidorUrl,
  setServidorUrl,
  buscarEstado,
  criarPendente,
  corrigirPendente,
  confirmarPendente,
  descartarPendente,
  reiniciarSessao,
  conectarTempoReal
} from '../core/apiClient.js';
import { DENOMINACOES } from '../core/denominacoes.js';
import QrTelaCheia from '../components/QrTelaCheia.jsx';
import { rodandoDentroDoApp, iniciarServidorEmbutido } from '../native/embeddedServer.js';

function FormularioNovoVisitante({ onCriar }) {
  const [nome, setNome] = useState('');
  const [igreja, setIgreja] = useState('');
  const [local, setLocal] = useState('');
  const [cargo, setCargo] = useState('sem_cargo');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(e) {
    e.preventDefault();
    if (!nome.trim() || !igreja.trim() || !local.trim()) {
      setErro('Preencha nome, igreja e local.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      await onCriar({ nome, igreja, local, cargo });
      setNome('');
      setIgreja('');
      setLocal('');
      setCargo('sem_cargo');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="form-visitante" onSubmit={enviar}>
      <h2>Novo visitante</h2>
      {erro && <p className="erro">{erro}</p>}
      <div className="campo">
        <label>Nome completo</label>
        <input
          placeholder="Ex.: José da Silva"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
      </div>
      <div className="campo">
        <label>Igreja de origem</label>
        <input
          placeholder="Ex.: Assembleia de Deus"
          list="sugestoes-igreja"
          value={igreja}
          onChange={(e) => setIgreja(e.target.value)}
        />
      </div>
      <datalist id="sugestoes-igreja">
        {DENOMINACOES.map((d) => <option key={d} value={d} />)}
      </datalist>
      <div className="campo">
        <label>Local (cidade/bairro)</label>
        <input
          placeholder="Ex.: Lajinha"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
      </div>
      <div className="campo">
        <label>Cargo</label>
        <select value={cargo} onChange={(e) => setCargo(e.target.value)}>
          {CARGOS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={enviando}>
        {enviando ? 'Adicionando...' : 'Adicionar à fila de correção'}
      </button>
    </form>
  );
}

function ItemPendente({ item, onConfirmar, onDescartar, onCorrigir }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [igreja, setIgreja] = useState(item.igreja);
  const [local, setLocal] = useState(item.local);
  const [cargo, setCargo] = useState(item.cargo);

  async function salvar() {
    await onCorrigir(item.id, { nome, igreja, local, cargo });
    setEditando(false);
  }

  if (editando) {
    return (
      <li className="item-pendente editando">
        <input value={nome} onChange={(e) => setNome(e.target.value)} />
        <input list="sugestoes-igreja" value={igreja} onChange={(e) => setIgreja(e.target.value)} />
        <input value={local} onChange={(e) => setLocal(e.target.value)} />
        <select value={cargo} onChange={(e) => setCargo(e.target.value)}>
          {CARGOS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="acoes">
          <button onClick={salvar}>Salvar</button>
          <button onClick={() => setEditando(false)}>Cancelar</button>
        </div>
      </li>
    );
  }

  return (
    <li className="item-pendente">
      <div className="info">
        <strong>{item.nome}</strong>
        <span>{item.igreja} — {item.local}</span>
        <span className="cargo">{CARGOS.find((c) => c.id === item.cargo)?.label}</span>
      </div>
      <div className="acoes">
        <button onClick={() => setEditando(true)}>Corrigir</button>
        <button className="confirmar" onClick={() => onConfirmar(item.id)}>Confirmar</button>
        <button className="descartar" onClick={() => onDescartar(item.id)}>Descartar</button>
      </div>
    </li>
  );
}

export default function Recepcao() {
  // Dentro do app Android o servidor sobe sozinho a cada abertura da tela.
  // Em navegador comum (dev) cai no modo manual.
  const noApp = Boolean(rodandoDentroDoApp());
  const [servidorUrl, setServidorUrlLocal] = useState(noApp ? '' : getServidorUrl());
  const [estado, setEstado] = useState(null);
  const [erroConexao, setErroConexao] = useState('');
  const [redes, setRedes] = useState([]);
  const [mostrarQr, setMostrarQr] = useState(false);
  const [erroServidor, setErroServidor] = useState('');

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

  const salvarServidor = useCallback((url) => {
    setServidorUrl(url);
    setServidorUrlLocal(url);
    setErroConexao('');
  }, []);

  useEffect(() => {
    if (!noApp) return;
    iniciarServidorEmbutido()
      .then((r) => {
        setRedes(r.redes && r.redes.length ? r.redes : [{ interface: '', ip: r.ip, url: r.url }]);
        // Este aparelho conversa com o proprio servidor por loopback: funciona
        // sempre, mesmo que o IP da rede mude. O IP de rede serve so para o outro celular.
        salvarServidor('http://127.0.0.1:' + r.porta);
      })
      .catch((e) => setErroServidor(e.message));
  }, [noApp, salvarServidor]);

  if (!servidorUrl) {
    if (noApp) {
      return (
        <div className="tela tela-config">
          <h1>Iniciando servidor local...</h1>
          {erroServidor && <p className="erro">Não consegui iniciar o servidor: {erroServidor}</p>}
        </div>
      );
    }
    return <ConfigurarServidor onSalvar={salvarServidor} />;
  }

  const pendentes = estado?.pendentes || [];
  const totalConfirmados = estado?.grupos?.reduce(
    (acc, g) => acc + (g.tipo === 'caravana' ? g.totalPessoas : 1),
    0
  ) || 0;

  return (
    <div className="tela tela-recepcao">
      <div className="titulo-pagina">
        <h2>Recepção</h2>
        <span className="contador">{totalConfirmados} confirmados</span>
      </div>

      {redes.length > 0 && (
        <section className="aviso-endereco">
          <p>Digite no aparelho de Apresentação:</p>
          {redes.map((r) => (
            <p className="endereco-destaque" key={r.url}>
              {r.url}
              {r.interface && <small>rede: {r.interface}</small>}
            </p>
          ))}
          <button className="botao-link" onClick={() => setMostrarQr(true)}>Mostrar QR</button>
          {redes.length > 1 && (
            <p className="dica">
              Mais de um endereço? Use o da rede do hotspot/Wi-Fi (wlan, ap ou swlan), não o de dados móveis (rmnet).
            </p>
          )}
        </section>
      )}

      {mostrarQr && redes.length > 0 && <QrTelaCheia redes={redes} onFechar={() => setMostrarQr(false)} />}

      {erroConexao && <p className="erro">{erroConexao}</p>}

      <FormularioNovoVisitante onCriar={criarPendente} />

      <section className="fila-pendentes">
        <h2>Fila de correção ({pendentes.length})</h2>
        {pendentes.length === 0 && <p className="vazio">Nenhum visitante aguardando confirmação.</p>}
        <ul>
          {pendentes.map((item) => (
            <ItemPendente
              key={item.id}
              item={item}
              onConfirmar={confirmarPendente}
              onDescartar={descartarPendente}
              onCorrigir={corrigirPendente}
            />
          ))}
        </ul>
      </section>

      <button
        className="botao-reiniciar"
        onClick={() => {
          if (confirm('Reiniciar a sessão apaga toda a lista atual. Confirma?')) {
            reiniciarSessao();
          }
        }}
      >
        Reiniciar sessão (novo culto)
      </button>
    </div>
  );
}

function ConfigurarServidor({ onSalvar }) {
  const [url, setUrl] = useState('http://192.168.');
  return (
    <div className="tela tela-config">
      <h1>Configurar este aparelho como Recepção</h1>
      <p>
        Modo manual (navegador de desenvolvimento): aponte para um servidor já
        rodando, por exemplo `npm run server`.
      </p>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.x.x:8080" />
      <button onClick={() => onSalvar(url)}>Salvar</button>
    </div>
  );
}
