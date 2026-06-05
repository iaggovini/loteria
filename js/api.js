import { API_BASE, MODALITIES, HISTORY_PAGE_SIZE } from './config.js';

const HEADERS = { Accept: 'application/json' };

function parseBalls(data) {
  const raw = data.listaDezenas || data.dezenasSorteadasOrdemSorteio || [];
  return raw.map((d) => Number(d)).sort((a, b) => a - b);
}

export function normalizeContest(data, modalityId) {
  const balls = parseBalls(data);
  return {
    contest: data.numero,
    date: data.dataApuracao || '',
    balls,
    accumulated: Boolean(data.acumulado),
    nextContest: data.numeroConcursoProximo,
    nextDate: data.dataProximoConcurso || '',
    nextPrize: data.valorEstimadoProximoConcurso ?? null,
    locality: data.nomeMunicipioUFSorteio || data.localSorteio || '',
    modalityId
  };
}

export async function fetchContest(modalityId, contestNumber) {
  const mod = MODALITIES[modalityId];
  const url = `${API_BASE}/${mod.apiPath}/${contestNumber}`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return normalizeContest(data, modalityId);
}

export async function fetchLatest(modalityId) {
  const mod = MODALITIES[modalityId];
  const url = `${API_BASE}/${mod.apiPath}`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return normalizeContest(data, modalityId);
}

export async function fetchHistoryFromApi(modalityId, startContest, count) {
  const results = [];
  const tasks = [];

  for (let i = 0; i < count; i += 1) {
    const num = startContest - i;
    if (num < 1) break;
    tasks.push(
      fetchContest(modalityId, num).catch(() => null)
    );
  }

  const settled = await Promise.all(tasks);
  settled.forEach((item) => {
    if (item) results.push(item);
  });
  return results.sort((a, b) => b.contest - a.contest);
}

export async function loadFallbackHistory(modalityId) {
  const response = await fetch(`data/history-${modalityId}.json`);
  if (!response.ok) throw new Error('Fallback indisponível');
  const data = await response.json();
  return Array.isArray(data) ? data : data.contests || [];
}

export async function loadInitialHistory(modalityId) {
  try {
    const latest = await fetchLatest(modalityId);
    const more = await fetchHistoryFromApi(
      modalityId,
      latest.contest - 1,
      HISTORY_PAGE_SIZE - 1
    );
    return { source: 'api', contests: [latest, ...more] };
  } catch {
    const fallback = await loadFallbackHistory(modalityId);
    return { source: 'local', contests: fallback.slice(0, HISTORY_PAGE_SIZE) };
  }
}

export async function loadMoreHistory(modalityId, oldestLoaded, count = HISTORY_PAGE_SIZE) {
  try {
    const more = await fetchHistoryFromApi(modalityId, oldestLoaded - 1, count);
    if (more.length) return { source: 'api', contests: more };
  } catch {
    /* tenta fallback */
  }

  const fallback = await loadFallbackHistory(modalityId);
  const older = fallback.filter((c) => c.contest < oldestLoaded);
  return {
    source: 'local',
    contests: older.slice(0, count)
  };
}
