// core/cargos.js
// Tabela de precedência combinada: autoridades públicas + hierarquia eclesiástica.
// Índice menor = maior precedência (aparece primeiro / vira representante do grupo).

export const CARGOS = [
  // Autoridades públicas
  { id: 'presidente', label: 'Presidente', categoria: 'autoridade' },
  { id: 'senador', label: 'Senador', categoria: 'autoridade' },
  { id: 'dep_federal', label: 'Deputado Federal', categoria: 'autoridade' },
  { id: 'dep_estadual', label: 'Deputado Estadual', categoria: 'autoridade' },
  { id: 'prefeito', label: 'Prefeito', categoria: 'autoridade' },
  { id: 'vice_prefeito', label: 'Vice-Prefeito', categoria: 'autoridade' },
  { id: 'vereador', label: 'Vereador', categoria: 'autoridade' },
  { id: 'militar', label: 'Militar', categoria: 'autoridade' },

  // Hierarquia eclesiástica
  { id: 'pastor', label: 'Pastor', abreviacao: 'Pr.', categoria: 'eclesiastico' },
  { id: 'evangelista', label: 'Evangelista', abreviacao: 'Ev.', categoria: 'eclesiastico' },
  { id: 'presbitero', label: 'Presbítero / Ancião', abreviacao: 'PB', categoria: 'eclesiastico' },
  { id: 'diacono', label: 'Diácono', abreviacao: 'Dc.', categoria: 'eclesiastico' },
  { id: 'auxiliar', label: 'Auxiliar / Cooperador', abreviacao: 'Aux.', categoria: 'eclesiastico' },

  // Sem cargo — sempre por último
  { id: 'sem_cargo', label: 'Sem cargo / Membro comum', categoria: 'comum' }
];

const INDICE_PRECEDENCIA = new Map(CARGOS.map((c, i) => [c.id, i]));

export function precedencia(cargoId) {
  if (!cargoId || !INDICE_PRECEDENCIA.has(cargoId)) {
    return INDICE_PRECEDENCIA.get('sem_cargo');
  }
  return INDICE_PRECEDENCIA.get(cargoId);
}

export function getCargo(cargoId) {
  return CARGOS.find((c) => c.id === cargoId) || CARGOS.find((c) => c.id === 'sem_cargo');
}

export function tituloExibicao(cargoId) {
  const cargo = getCargo(cargoId);
  return cargo.abreviacao || (cargo.id === 'sem_cargo' ? '' : cargo.label);
}
