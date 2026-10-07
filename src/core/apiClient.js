// core/apiClient.js
// Cliente compartilhado entre as telas de Recepção e Apresentação para
// falar com o servidor local (ou com o fallback Vercel — ver README).
// O endereço do servidor é configurável em runtime porque cada aparelho
// vai apontar para um IP local diferente (o do celular que está na porta).

const CHAVE_STORAGE = 'recepcao_servidor_url';

export function getServidorUrl() {
  return localStorage.getItem(CHAVE_STORAGE) || '';
}

// Aceita "192.168.43.1", "192.168.43.1:8080" ou "http://192.168.43.1:8080"
// e devolve sempre "http://IP:PORTA" (porta padrao 8080).
export function normalizarUrl(texto) {
  let t = (texto || '').trim().replace(/\s+/g, '');
  if (!t) return '';
  t = t.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!/:\d+$/.test(t)) t += ':8080';
  return 'http://' + t;
}

export function setServidorUrl(url) {
  localStorage.setItem(CHAVE_STORAGE, normalizarUrl(url));
}

export function limparServidorUrl() {
  localStorage.removeItem(CHAVE_STORAGE);
}

function baseUrl() {
  const url = getServidorUrl();
  if (!url) throw new Error('Servidor não configurado. Informe o IP do aparelho de Recepção.');
  return url;
}

// fetch com limite de tempo: um IP que nao responde nao pode deixar a tela
// parada para sempre sem mensagem.
async function fetchComTimeout(url, opcoes, ms = 6000) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), ms);
  try {
    return await fetch(url, { ...(opcoes || {}), signal: controlador.signal });
  } catch (e) {
    if (e && e.name === 'AbortError') {
      throw new Error('Tempo esgotado: o servidor não respondeu em ' + url);
    }
    throw new Error('Não consegui falar com o servidor em ' + url);
  } finally {
    clearTimeout(timer);
  }
}

export async function buscarEstado() {
  const res = await fetchComTimeout(`${baseUrl()}/api/estado`);
  if (!res.ok) throw new Error('Falha ao buscar estado');
  return res.json();
}

export async function criarPendente(visitante) {
  const res = await fetch(`${baseUrl()}/api/pendentes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitante)
  });
  if (!res.ok) throw new Error((await res.json()).erro || 'Falha ao criar pendente');
  return res.json();
}

export async function corrigirPendente(id, dados) {
  const res = await fetch(`${baseUrl()}/api/pendentes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  if (!res.ok) throw new Error('Falha ao corrigir pendente');
  return res.json();
}

export async function confirmarPendente(id) {
  const res = await fetch(`${baseUrl()}/api/pendentes/${id}/confirmar`, { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao confirmar pendente');
  return res.json();
}

export async function descartarPendente(id) {
  const res = await fetch(`${baseUrl()}/api/pendentes/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error('Falha ao descartar pendente');
}

export async function reiniciarSessao() {
  const res = await fetch(`${baseUrl()}/api/sessao/reiniciar`, { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao reiniciar sessão');
  return res.json();
}

/**
 * Abre um WebSocket para receber o estado em tempo real.
 * Retorna uma função de "desconectar".
 */
export function conectarTempoReal(onEstado, onErro) {
  const wsUrl = baseUrl().replace(/^http/, 'ws');
  let ws;
  let fechar = false;

  function conectar() {
    ws = new WebSocket(wsUrl);
    // se o WebSocket nao abrir em 6s, avisa (IP errado / fora do hotspot)
    const timerAbrir = setTimeout(() => {
      if (ws && ws.readyState !== 1) onErro && onErro(new Error('Tempo esgotado ao conectar em ' + wsUrl));
    }, 6000);
    ws.onopen = () => clearTimeout(timerAbrir);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.tipo === 'estado') onEstado(msg.dados);
      } catch (e) {
        // ignora mensagens malformadas
      }
    };
    ws.onerror = () => onErro && onErro(new Error('Erro de conexão com o servidor local'));
    ws.onclose = () => {
      clearTimeout(timerAbrir);
      if (!fechar) setTimeout(conectar, 2000); // tenta reconectar
    };
  }

  conectar();

  return () => {
    fechar = true;
    ws && ws.close();
  };
}
