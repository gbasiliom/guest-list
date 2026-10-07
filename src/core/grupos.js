// core/grupos.js
// Lógica central: transforma a lista bruta de visitantes confirmados
// em uma "view" de exibição já agrupada em caravanas, recalculada
// do zero a cada chamada (sem estado próprio) — é isso que garante
// consistência em tempo real entre inserções.

import { precedencia, tituloExibicao } from './cargos.js';

const LIMITE_CARAVANA = 3; // mais de 3 pessoas (>=4) vira caravana

function chaveGrupo(visitante) {
  return `${visitante.igreja.trim().toLowerCase()}|${visitante.local.trim().toLowerCase()}`;
}

/**
 * @param {Array} visitantes - lista de visitantes já confirmados
 *   (passaram pela camada de correção). Cada item:
 *   { id, nome, igreja, local, cargo, criadoEm }
 * @returns {Array} itens prontos para exibição, cada um:
 *   { tipo: 'individual', visitante }
 *   ou
 *   { tipo: 'caravana', etiqueta, representante, membros, totalPessoas }
 */
export function calcularGrupos(visitantes) {
  const grupos = new Map();

  for (const v of visitantes) {
    const chave = chaveGrupo(v);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(v);
  }

  const resultado = [];

  for (const membros of grupos.values()) {
    if (membros.length <= LIMITE_CARAVANA) {
      for (const v of membros) {
        resultado.push({ tipo: 'individual', visitante: v });
      }
      continue;
    }

    // Ordena por precedência para achar o representante
    const ordenados = [...membros].sort(
      (a, b) => precedencia(a.cargo) - precedencia(b.cargo)
    );
    const representante = ordenados[0];
    const titulo = tituloExibicao(representante.cargo);

    const etiqueta = titulo
      ? `${titulo} ${representante.nome} + caravana — ${representante.igreja}, ${representante.local} (${membros.length} pessoas)`
      : `${representante.nome} + caravana — ${representante.igreja}, ${representante.local} (${membros.length} pessoas)`;

    resultado.push({
      tipo: 'caravana',
      etiqueta,
      representante,
      membros,
      totalPessoas: membros.length
    });
  }

  // Ordena a lista final também por precedência (autoridade/cargo mais alto aparece primeiro),
  // usando o item de maior precedência de cada entrada como critério.
  resultado.sort((a, b) => {
    const pa = a.tipo === 'individual' ? precedencia(a.visitante.cargo) : precedencia(a.representante.cargo);
    const pb = b.tipo === 'individual' ? precedencia(b.visitante.cargo) : precedencia(b.representante.cargo);
    if (pa !== pb) return pa - pb;
    const ta = a.tipo === 'individual' ? a.visitante.criadoEm : a.representante.criadoEm;
    const tb = b.tipo === 'individual' ? b.visitante.criadoEm : b.representante.criadoEm;
    return ta - tb;
  });

  return resultado;
}
