import { HISTORY_PAGE_SIZE, MODALITIES, ModalityId } from '@/constants/modalities';

import historyLotofacil from '../data/history-lotofacil.json';
import historyLotomania from '../data/history-lotomania.json';
import historyMegasena from '../data/history-megasena.json';
import historyQuina from '../data/history-quina.json';

const API_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api';
const HEADERS = { Accept: 'application/json' };

export interface Contest {
  contest: number;
  date: string;
  balls: number[];
  accumulated: boolean;
  nextContest: number | null;
  nextDate: string;
  nextPrize: number | null;
  locality: string;
  modalityId: ModalityId;
}

type HistorySource = 'api' | 'local';

const FALLBACKS: Record<ModalityId, Contest[]> = {
  megasena: historyMegasena as Contest[],
  lotofacil: historyLotofacil as Contest[],
  quina: historyQuina as Contest[],
  lotomania: historyLotomania as Contest[],
};

function parseBalls(data: any): number[] {
  const raw = data.listaDezenas || data.dezenasSorteadasOrdemSorteio || [];
  return raw.map((d: unknown) => Number(d)).sort((a: number, b: number) => a - b);
}

function normalizeContest(data: any, modalityId: ModalityId): Contest {
  return {
    contest: data.numero,
    date: data.dataApuracao || '',
    balls: parseBalls(data),
    accumulated: Boolean(data.acumulado),
    nextContest: data.numeroConcursoProximo ?? null,
    nextDate: data.dataProximoConcurso || '',
    nextPrize: data.valorEstimadoProximoConcurso ?? null,
    locality: data.nomeMunicipioUFSorteio || data.localSorteio || '',
    modalityId,
  };
}

async function fetchContest(modalityId: ModalityId, contestNumber: number): Promise<Contest> {
  const mod = MODALITIES[modalityId];
  const response = await fetch(`${API_BASE}/${mod.apiPath}/${contestNumber}`, { headers: HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return normalizeContest(await response.json(), modalityId);
}

async function fetchLatest(modalityId: ModalityId): Promise<Contest> {
  const mod = MODALITIES[modalityId];
  const response = await fetch(`${API_BASE}/${mod.apiPath}`, { headers: HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return normalizeContest(await response.json(), modalityId);
}

async function fetchHistoryFromApi(
  modalityId: ModalityId,
  startContest: number,
  count: number
): Promise<Contest[]> {
  const tasks: Promise<Contest | null>[] = [];

  for (let i = 0; i < count; i += 1) {
    const num = startContest - i;
    if (num < 1) break;
    tasks.push(fetchContest(modalityId, num).catch(() => null));
  }

  const settled = await Promise.all(tasks);
  return settled
    .filter((item): item is Contest => item !== null)
    .sort((a, b) => b.contest - a.contest);
}

function loadFallbackHistory(modalityId: ModalityId): Contest[] {
  return FALLBACKS[modalityId];
}

export async function loadInitialHistory(
  modalityId: ModalityId
): Promise<{ source: HistorySource; contests: Contest[] }> {
  try {
    const latest = await fetchLatest(modalityId);
    const more = await fetchHistoryFromApi(modalityId, latest.contest - 1, HISTORY_PAGE_SIZE - 1);
    return { source: 'api', contests: [latest, ...more] };
  } catch {
    const fallback = loadFallbackHistory(modalityId);
    return { source: 'local', contests: fallback.slice(0, HISTORY_PAGE_SIZE) };
  }
}

export async function loadMoreHistory(
  modalityId: ModalityId,
  oldestLoaded: number,
  count: number = HISTORY_PAGE_SIZE
): Promise<{ source: HistorySource; contests: Contest[] }> {
  try {
    const more = await fetchHistoryFromApi(modalityId, oldestLoaded - 1, count);
    if (more.length) return { source: 'api', contests: more };
  } catch {
    /* tenta fallback */
  }

  const fallback = loadFallbackHistory(modalityId);
  const older = fallback.filter((c) => c.contest < oldestLoaded);
  return { source: 'local', contests: older.slice(0, count) };
}
