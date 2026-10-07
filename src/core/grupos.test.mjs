// core/grupos.test.mjs — teste manual rápido (node core/grupos.test.mjs)
// Não é um framework de teste formal; serve para validar a lógica de
// agrupamento antes de conectar à UI.

import { calcularGrupos } from './grupos.js';

let falhas = 0;
function assert(condicao, msg) {
  if (!condicao) {
    falhas++;
    console.error('FALHOU:', msg);
  } else {
    console.log('ok:', msg);
  }
}

function v(nome, igreja, local, cargo, t) {
  return { id: nome, nome, igreja, local, cargo, criadoEm: t };
}

// Caso 1: 2 pessoas do mesmo lugar → não vira caravana
{
  const lista = [
    v('Ana', 'Igreja X', 'Mutum', 'sem_cargo', 1),
    v('Bia', 'Igreja X', 'Mutum', 'sem_cargo', 2)
  ];
  const r = calcularGrupos(lista);
  assert(r.length === 2 && r.every((i) => i.tipo === 'individual'), 'grupo de 2 fica individual');
}

// Caso 2: 4 pessoas do mesmo lugar, sem cargo → caravana, representante = primeiro digitado
{
  const lista = [
    v('Carlos', 'Igreja X', 'Mutum', 'sem_cargo', 1),
    v('Duda', 'Igreja X', 'Mutum', 'sem_cargo', 2),
    v('Elias', 'Igreja X', 'Mutum', 'sem_cargo', 3),
    v('Fabio', 'Igreja X', 'Mutum', 'sem_cargo', 4)
  ];
  const r = calcularGrupos(lista);
  assert(r.length === 1 && r[0].tipo === 'caravana', '4 pessoas sem cargo vira 1 caravana');
  assert(r[0].representante.nome === 'Carlos', 'representante é o primeiro digitado quando ninguém tem cargo');
  assert(r[0].etiqueta === 'Carlos + caravana — Igreja X, Mutum (4 pessoas)', 'etiqueta sem cargo no formato esperado');
}

// Caso 3: grupo com Presbítero e Diácono → Presbítero vence (maior precedência eclesiástica)
{
  const lista = [
    v('Diácono João', 'Igreja Y', 'Alegre', 'diacono', 1),
    v('Presbítero Pedro', 'Igreja Y', 'Alegre', 'presbitero', 2),
    v('Maria', 'Igreja Y', 'Alegre', 'sem_cargo', 3),
    v('Marta', 'Igreja Y', 'Alegre', 'sem_cargo', 4)
  ];
  const r = calcularGrupos(lista);
  assert(r[0].representante.nome === 'Presbítero Pedro', 'Presbítero vence Diácono');
  assert(r[0].etiqueta.startsWith('PB Presbítero Pedro'), 'etiqueta usa abreviação PB');
}

// Caso 4: autoridade pública vence Pastor
{
  const lista = [
    v('Pastor Lucas', 'Igreja Z', 'Mutum', 'pastor', 1),
    v('Vereador Souza', 'Igreja Z', 'Mutum', 'vereador', 2),
    v('Rita', 'Igreja Z', 'Mutum', 'sem_cargo', 3),
    v('Sara', 'Igreja Z', 'Mutum', 'sem_cargo', 4)
  ];
  const r = calcularGrupos(lista);
  assert(r[0].representante.nome === 'Vereador Souza', 'Autoridade pública vence Pastor');
}

// Caso 5: mesma cidade, igrejas diferentes → NÃO agrupa entre si
// (4 pessoas da Assembleia de Deus formam caravana; 1 da Batista fica individual)
{
  const lista = [
    v('Tim', 'Assembleia de Deus', 'Mutum', 'sem_cargo', 1),
    v('Ursula', 'Batista', 'Mutum', 'sem_cargo', 2),
    v('Vitor', 'Assembleia de Deus', 'Mutum', 'sem_cargo', 3),
    v('Wagner', 'Assembleia de Deus', 'Mutum', 'sem_cargo', 4),
    v('Xavier', 'Assembleia de Deus', 'Mutum', 'sem_cargo', 5)
  ];
  const r = calcularGrupos(lista);
  const caravanas = r.filter((i) => i.tipo === 'caravana');
  assert(caravanas.length === 1, 'só a Assembleia de Deus forma caravana (4 pessoas), Batista fica individual');
  assert(r.filter((i) => i.tipo === 'individual').length === 1, 'Ursula (Batista) fica individual');
}

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);
