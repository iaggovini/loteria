export const API_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api';

export const MODALITIES = {
  megasena: {
    id: 'megasena',
    name: 'Mega-Sena',
    pick: 6,
    min: 1,
    max: 60,
    gridCols: 10,
    apiPath: 'megasena',
    price: 6, // aposta simples, em R$ (site da Caixa, nov/2026)
    drawDays: 'terças e quintas às 21h, domingos às 11h',
    description: 'Escolha 6 números de 01 a 60.',
    prizeTiers: [
      { hits: 6, label: 'Sena (6 acertos)' },
      { hits: 5, label: 'Quina (5 acertos)' },
      { hits: 4, label: 'Quadra (4 acertos)' }
    ]
  },
  lotofacil: {
    id: 'lotofacil',
    name: 'Lotofácil',
    pick: 15,
    min: 1,
    max: 25,
    gridCols: 5,
    apiPath: 'lotofacil',
    price: 3.5, // aposta simples, em R$ (site da Caixa, nov/2026)
    drawDays: 'segunda a sexta às 21h, domingos às 11h',
    description: 'Escolha 15 números de 01 a 25.',
    prizeTiers: [
      { hits: 15, label: '15 acertos' },
      { hits: 14, label: '14 acertos' },
      { hits: 13, label: '13 acertos' },
      { hits: 12, label: '12 acertos' },
      { hits: 11, label: '11 acertos' }
    ]
  },
  quina: {
    id: 'quina',
    name: 'Quina',
    pick: 5,
    min: 1,
    max: 80,
    gridCols: 10,
    apiPath: 'quina',
    price: 3, // aposta simples, em R$ (site da Caixa, nov/2026)
    drawDays: 'segunda a sexta às 21h, domingos às 11h',
    description: 'Escolha 5 números de 01 a 80.',
    prizeTiers: [
      { hits: 5, label: 'Quina (5 acertos)' },
      { hits: 4, label: 'Quadra (4 acertos)' },
      { hits: 3, label: 'Terno (3 acertos)' },
      { hits: 2, label: 'Duque (2 acertos)' }
    ]
  },
  lotomania: {
    id: 'lotomania',
    name: 'Lotomania',
    pick: 50,
    min: 0,
    max: 99,
    gridCols: 10,
    apiPath: 'lotomania',
    price: 3, // aposta simples, em R$ (site da Caixa, nov/2026)
    drawDays: 'segundas, quartas e sextas às 21h',
    description: 'Escolha 50 números de 00 a 99. São sorteados 20.',
    prizeTiers: [
      { hits: 20, label: '20 acertos' },
      { hits: 19, label: '19 acertos' },
      { hits: 18, label: '18 acertos' },
      { hits: 17, label: '17 acertos' },
      { hits: 16, label: '16 acertos' },
      { hits: 15, label: '15 acertos' },
      { hits: 0, label: '0 acertos (prêmio especial)' }
    ]
  },
  duplasena: {
    id: 'duplasena',
    name: 'Dupla Sena',
    pick: 6,
    min: 1,
    max: 50,
    gridCols: 10,
    apiPath: 'duplasena',
    price: 3, // aposta simples, em R$ (site da Caixa, nov/2026)
    drawDays: 'segundas, quartas e sextas às 21h',
    description: 'Escolha 6 números de 01 a 50. Dois sorteios por concurso.',
    multiDraw: true,
    prizeTiers: [
      { hits: 6, label: 'Sena (6 acertos)' },
      { hits: 5, label: 'Quina (5 acertos)' },
      { hits: 4, label: 'Quadra (4 acertos)' },
      { hits: 3, label: 'Terno (3 acertos)' }
    ]
  },
  maismilionaria: {
    id: 'maismilionaria',
    name: '+Milionária',
    pick: 6,
    min: 1,
    max: 50,
    gridCols: 10,
    apiPath: 'maismilionaria',
    price: 6, // aposta simples, em R$ (site da Caixa, nov/2026)
    drawDays: 'quartas e sextas às 21h',
    description: 'Escolha 6 números de 01 a 50 e 2 trevos de 1 a 6.',
    extra: { key: 'trevo', label: 'Trevo', min: 1, max: 6, pick: 2 },
    prizeTiers: [
      { hits: 6, extraHits: 2, label: '6 acertos + 2 trevos' },
      { hits: 6, extraHits: 0, label: '6 acertos + 1 ou nenhum trevo' },
      { hits: 5, extraHits: 2, label: '5 acertos + 2 trevos' },
      { hits: 5, extraHits: 0, label: '5 acertos + 1 ou nenhum trevo' },
      { hits: 4, extraHits: 2, label: '4 acertos + 2 trevos' },
      { hits: 4, extraHits: 0, label: '4 acertos + 1 ou nenhum trevo' },
      { hits: 3, extraHits: 2, label: '3 acertos + 2 trevos' },
      { hits: 3, extraHits: 1, label: '3 acertos + 1 trevo' },
      { hits: 2, extraHits: 2, label: '2 acertos + 2 trevos' },
      { hits: 2, extraHits: 1, label: '2 acertos + 1 trevo' }
    ]
  }
};

export const DEFAULT_MODALITY = 'megasena';
export const HISTORY_PAGE_SIZE = 9;
export const STATS_CONTESTS = 30;

export const MODALITY_COLORS = {
  megasena: '#0a7d3e',
  lotofacil: '#8a2fbd',
  quina: '#2158d6',
  lotomania: '#c2410c',
  duplasena: '#be185d',
  maismilionaria: '#17724e'
};

export function formatNumber(value) {
  return String(value).padStart(2, '0');
}

export function formatMoney(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* Faixa de premiação atingida (ou null se a aposta não foi premiada). */
export function findPrizeTier(modality, hits, extraHits = 0) {
  if (!modality.extra) return modality.prizeTiers.find((t) => t.hits === hits) || null;
  return modality.prizeTiers.find((t) => {
    if (t.hits !== hits) return false;
    if (t.extraHits === 2) return extraHits === 2;
    if (t.extraHits === 1) return extraHits >= 1;
    return true;
  }) || null;
}

export function getPrizeLabel(modality, hits) {
  const tier = findPrizeTier(modality, hits);
  if (tier) return tier.label;
  return `${hits} acerto${hits === 1 ? '' : 's'} (sem prêmio)`;
}

export function getExtraPrizeLabel(modality, hits, extraHits) {
  const tier = findPrizeTier(modality, hits, extraHits);
  if (tier) return tier.label;
  return `${hits} acerto${hits === 1 ? '' : 's'} + ${extraHits} trevo${extraHits === 1 ? '' : 's'} (sem prêmio)`;
}
