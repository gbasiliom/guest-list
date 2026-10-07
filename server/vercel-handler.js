// server/vercel-handler.js
//
// ATENÇÃO — LEIA ANTES DE USAR EM PRODUÇÃO:
// Funções serverless da Vercel são stateless e efêmeras (cada
// requisição pode cair numa instância diferente, que não guarda
// memória entre chamadas). O servidor local (server/index.js) usa
// estado em memória porque roda continuamente num único processo —
// isso NÃO funciona do mesmo jeito aqui.
//
// Este arquivo é um esqueleto funcional para poucos usuários/teste,
// mas para uso real como fallback "online" ele precisa de um banco
// persistente e de baixa latência (ex: Vercel KV / Upstash Redis) no
// lugar das variáveis em memória abaixo, e WebSocket não funciona em
// funções serverless tradicionais — o fallback online precisaria
// trocar para polling curto (o cliente já suporta isso, ver
// apiClient.js) ou um serviço de real-time dedicado (Pusher/Ably/
// Supabase Realtime).
//
// Ou seja: o modo offline (hotspot + servidor local) é o caminho
// maduro hoje. Este arquivo documenta o caminho para o fallback
// online, não é uma implementação pronta para produção.

import { calcularGrupos } from '../src/core/grupos.js';

// Estado em memória — funciona apenas enquanto a mesma instância
// serverless permanecer "quente". Não confiável para produção.
let pendentes = [];
let confirmados = [];

export default function handler(req, res) {
  const { url, method } = req;

  if (url === '/api/estado' && method === 'GET') {
    return res.json({ pendentes, grupos: calcularGrupos(confirmados) });
  }

  res.status(501).json({
    erro: 'Fallback online ainda não implementado com persistência real. Ver comentário no topo deste arquivo.'
  });
}
