// core/expiracao.js
// Regra das 10 horas: a lista de visitantes expira 10h após o horário
// em que a sessão foi criada (ex: início do culto). Ao expirar, os
// dados brutos (nomes) devem ser apagados dos dois aparelhos — decisão
// de LGPD, não apenas operacional.

export const DURACAO_SESSAO_MS = 10 * 60 * 60 * 1000; // 10 horas

export function calcularExpiracao(criadoEm) {
  return criadoEm + DURACAO_SESSAO_MS;
}

export function sessaoExpirada(criadoEm, agora = Date.now()) {
  return agora >= calcularExpiracao(criadoEm);
}

export function tempoRestanteMs(criadoEm, agora = Date.now()) {
  return Math.max(0, calcularExpiracao(criadoEm) - agora);
}

/**
 * Gera um resumo agregado (sem nomes) antes da expiração —
 * é o único dado que deve sobreviver à limpeza, se a igreja
 * quiser estatística histórica.
 */
export function gerarResumoAgregado(visitantes, grupos) {
  const caravanas = grupos.filter((g) => g.tipo === 'caravana');
  const comCargo = visitantes.filter((v) => v.cargo && v.cargo !== 'sem_cargo');
  return {
    totalVisitantes: visitantes.length,
    totalCaravanas: caravanas.length,
    totalComCargo: comCargo.length,
    geradoEm: Date.now()
  };
}
