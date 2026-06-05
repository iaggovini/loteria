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
    drawDays: 'quartas e sábados',
    description: 'Escolha 6 números de 01 a 60.',
    prizeTiers: [
      { hits: 6, label: 'Sena (6 acertos)' },
      { hits: 5, label: 'Quina (5 acertos)' },
      { hits: 4, label: 'Quadra (4 acertos)' },
      { hits: 3, label: 'Terno (3 acertos — sem prêmio fixo)' }
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
    drawDays: 'segunda a sábado',
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
    drawDays: 'segunda a sábado',
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
    pick: 20,
    min: 0,
    max: 99,
    gridCols: 10,
    apiPath: 'lotomania',
    drawDays: 'segundas, quartas e sextas',
    description: 'Escolha 20 números de 00 a 99.',
    prizeTiers: [
      { hits: 20, label: '20 acertos' },
      { hits: 19, label: '19 acertos' },
      { hits: 18, label: '18 acertos' },
      { hits: 17, label: '17 acertos' },
      { hits: 16, label: '16 acertos' },
      { hits: 15, label: '15 acertos' },
      { hits: 0, label: '0 acertos (prêmio especial)' }
    ]
  }
};

export const DEFAULT_MODALITY = 'megasena';
export const HISTORY_PAGE_SIZE = 6;
export const STATS_CONTESTS = 30;

export function formatNumber(value, modality) {
  const pad = modality.max > 60 || modality.id === 'lotomania' ? 2 : 2;
  return String(value).padStart(pad, '0');
}

export function getPrizeLabel(modality, hits) {
  const tier = modality.prizeTiers.find((t) => t.hits === hits);
  if (tier) return tier.label;
  if (hits >= 3 && modality.id === 'megasena') return `${hits} acertos`;
  return `${hits} acerto${hits === 1 ? '' : 's'}`;
}
