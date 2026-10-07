// server/index.js
//
// Servidor de referência do App Recepção: HTTP (API REST simples) +
// WebSocket (broadcast em tempo real pro App Apresentação).
//
// IMPORTANTE (ver RELATÓRIO/README): esta implementação roda em Node.js
// e serve para (1) desenvolvimento/testes no computador e (2) ser a
// especificação exata da lógica que precisa ser portada para um plugin
// nativo Android (Kotlin + NanoHTTPD ou similar) quando o app for
// empacotado com Capacitor — Node puro não roda dentro do app Android.
//
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { calcularGrupos } from '../src/core/grupos.js';
import { sessaoExpirada, gerarResumoAgregado, DURACAO_SESSAO_MS } from '../src/core/expiracao.js';

const PORTA = process.env.PORT || 8080;

const app = express();
// CORS igual ao servidor Kotlin embutido: o app Capacitor roda em http://localhost
// e fala com o servidor por IP, o que e uma origem diferente.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.static('dist')); // serve o build do front-end (App Recepção e Apresentação)

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Estado em memória (fonte da verdade) ---
let sessaoCriadaEm = Date.now();
let pendentes = []; // aguardando correção/confirmação
let confirmados = []; // já publicados na lista viva
let resumoFinal = null; // preenchido só quando a sessão expira

function estadoAtual() {
  if (sessaoExpirada(sessaoCriadaEm) && !resumoFinal) {
    resumoFinal = gerarResumoAgregado(confirmados, calcularGrupos(confirmados));
    pendentes = [];
    confirmados = [];
  }
  return {
    sessaoCriadaEm,
    expiraEm: sessaoCriadaEm + DURACAO_SESSAO_MS,
    expirada: !!resumoFinal,
    resumoFinal,
    pendentes,
    grupos: calcularGrupos(confirmados)
  };
}

function broadcast() {
  const payload = JSON.stringify({ tipo: 'estado', dados: estadoAtual() });
  for (const cliente of wss.clients) {
    if (cliente.readyState === 1) cliente.send(payload);
  }
}

// Verifica expiração periodicamente mesmo sem novas requisições
setInterval(() => {
  const antes = confirmados.length;
  estadoAtual();
  if (antes !== confirmados.length) broadcast(); // expirou e limpou → avisa os clientes
}, 60 * 1000);

// --- Rotas ---

// Estado completo (usado pelo App Apresentação ao conectar/reconectar)
app.get('/api/estado', (req, res) => {
  res.json(estadoAtual());
});

// Recepção digita um novo visitante → entra como pendente (camada de correção)
app.post('/api/pendentes', (req, res) => {
  const { nome, igreja, local, cargo } = req.body;
  if (!nome || !igreja || !local) {
    return res.status(400).json({ erro: 'nome, igreja e local são obrigatórios' });
  }
  const visitante = {
    id: nanoid(8),
    nome: String(nome).trim(),
    igreja: String(igreja).trim(),
    local: String(local).trim(),
    cargo: cargo || 'sem_cargo',
    criadoEm: Date.now()
  };
  pendentes.push(visitante);
  broadcast();
  res.status(201).json(visitante);
});

// Corrige um pendente antes de confirmar
app.patch('/api/pendentes/:id', (req, res) => {
  const item = pendentes.find((p) => p.id === req.params.id);
  if (!item) return res.status(404).json({ erro: 'não encontrado' });
  Object.assign(item, req.body);
  broadcast();
  res.json(item);
});

// Confirma um pendente → entra na lista viva (visível no App Apresentação)
app.post('/api/pendentes/:id/confirmar', (req, res) => {
  const idx = pendentes.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'não encontrado' });
  const [item] = pendentes.splice(idx, 1);
  confirmados.push(item);
  broadcast();
  res.json(item);
});

// Descarta um pendente (erro de digitação, visitante desistiu, etc.)
app.delete('/api/pendentes/:id', (req, res) => {
  pendentes = pendentes.filter((p) => p.id !== req.params.id);
  broadcast();
  res.status(204).end();
});

// Reinicia a sessão manualmente (ex: novo culto no mesmo dia)
app.post('/api/sessao/reiniciar', (req, res) => {
  sessaoCriadaEm = Date.now();
  pendentes = [];
  confirmados = [];
  resumoFinal = null;
  broadcast();
  res.json(estadoAtual());
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ tipo: 'estado', dados: estadoAtual() }));
});

server.listen(PORTA, () => {
  console.log(`Servidor de recepção rodando em http://0.0.0.0:${PORTA}`);
  console.log('App Apresentação deve conectar no IP local deste aparelho na mesma rede/hotspot.');
});
