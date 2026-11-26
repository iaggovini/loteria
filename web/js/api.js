import { API_BASE, MODALITIES, HISTORY_PAGE_SIZE } from './config.js';

const HEADERS = { Accept: 'application/json' };

function parseBalls(data) {
  const raw = data.listaDezenas || data.dezenasSorteadasOrdemSorteio || [];
  return raw.map((d) => Number(d)).sort((a, b) => a - b);
}

function parseSecondDraw(data) {
  const raw = data.listaDezenasSegundoSorteio;
  if (!Array.isArray(raw) || !raw.length) return null;
  return raw.map((d) => Number(d)).sort((a, b) => a - b);
}

function parseTrevos(data) {
  const raw = data.trevosSorteados;
  if (!Array.isArray(raw) || !raw.length) return null;
  return raw.map((d) => Number(d)).sort((a, b) => a - b);
}

export function normalizeContest(data, modalityId) {
  const balls = parseBalls(data);
  return {
    contest: data.numero,
    date: data.dataApuracao || '',
    balls,
    balls2: parseSecondDraw(data),
    trevos: parseTrevos(data),
    accumulated: Boolean(data.acumulado),
    nextContest: data.numeroConcursoProximo,
    nextDate: data.dataProximoConcurso || '',
    nextPrize: data.valorEstimadoProximoConcurso ?? null,
    locality: data.nomeMunicipioUFSorteio || data.localSorteio || '',
    prizes: parsePrizes(data),
    winnerPlaces: parseWinnerPlaces(data),
    modalityId
  };
}

function parsePrizes(data) {
  const raw = Array.isArray(data.listaRateioPremio) ? data.listaRateioPremio : [];
  return raw.map((r) => ({
    label: String(r.descricaoFaixa || '').trim(),
    winners: Number(r.numeroDeGanhadores) || 0,
    value: Number(r.valorPremio) || 0
  })).filter((r) => r.label);
}

function parseWinnerPlaces(data) {
  const raw = Array.isArray(data.listaMunicipioUFGanhadores) ? data.listaMunicipioUFGanhadores : [];
  return raw.map((r) => ({
    city: String(r.municipio || '').trim(),
    uf: String(r.uf || '').trim(),
    winners: Number(r.ganhadores) || 1,
    online: /canal eletr/i.test(String(r.municipio || ''))
  })).filter((r) => r.city || r.uf);
}

// ---------------------------------------------------------------------------
// Cache de concursos para as estatísticas. Resultado de concurso não muda,
// então guardamos uma versão compacta no navegador para não buscar de novo.
// ---------------------------------------------------------------------------
const CACHE_PREFIX = 'bds-contests-v1-';
const CACHE_LIMIT = 300;

function readCache(modalityId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + modalityId);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(modalityId, cache) {
  try {
    const keys = Object.keys(cache).map(Number).sort((a, b) => b - a);
    keys.slice(CACHE_LIMIT).forEach((k) => delete cache[k]);
    localStorage.setItem(CACHE_PREFIX + modalityId, JSON.stringify(cache));
  } catch {
    /* sem espaço ou bloqueado: segue sem cache */
  }
}

const compact = (c) => ({ c: c.contest, d: c.date, b: c.balls, b2: c.balls2 || undefined, t: c.trevos || undefined });
const expand = (x, modalityId) => ({ contest: x.c, date: x.d, balls: x.b, balls2: x.b2 || null, trevos: x.t || null, modalityId });

/**
 * Busca uma lista de concursos (em lotes, usando o cache). Concursos que
 * falharem ficam de fora. `onProgress(feitos, total)` é chamado a cada lote.
 */
export async function fetchContestsCached(modalityId, numbers, onProgress) {
  const cache = readCache(modalityId);
  const found = [];
  const missing = [];
  numbers.forEach((n) => (cache[n] ? found.push(expand(cache[n], modalityId)) : missing.push(n)));

  const BATCH = 5;
  let done = numbers.length - missing.length;
  onProgress?.(done, numbers.length);
  const failed = [];
  const runBatch = async (chunk, retry) => {
    const settled = await Promise.all(chunk.map((n) => fetchContest(modalityId, n).catch(() => null)));
    settled.forEach((c, i) => {
      if (!c) { if (!retry) failed.push(chunk[i]); return; }
      found.push(c);
      cache[c.contest] = compact(c);
    });
  };
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    await runBatch(chunk, false);
    done += chunk.length;
    onProgress?.(done, numbers.length);
  }
  // O serviço da Caixa às vezes recusa pedidos seguidos: tenta de novo, mais devagar.
  for (let attempt = 0; attempt < 2 && failed.length; attempt += 1) {
    await new Promise((r) => setTimeout(r, 1200));
    const retry = failed.splice(0);
    for (let i = 0; i < retry.length; i += 2) {
      const chunk = retry.slice(i, i + 2);
      const before = found.length;
      await runBatch(chunk, true);
      if (found.length - before < chunk.length && attempt === 0) {
        chunk.filter((n) => !found.some((c) => c.contest === n)).forEach((n) => failed.push(n));
      }
    }
  }
  if (missing.length) writeCache(modalityId, cache);
  return found.sort((a, b) => b.contest - a.contest);
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
  const numbers = [];
  for (let i = 0; i < count && startContest - i >= 1; i += 1) numbers.push(startContest - i);

  const settled = await Promise.all(numbers.map((n) => fetchContest(modalityId, n).catch(() => null)));
  const results = settled.filter(Boolean);

  // O serviço da Caixa às vezes recusa pedidos seguidos: os que falharam são
  // pedidos de novo, um de cada vez, para não deixar buracos na lista.
  let failed = numbers.filter((_, i) => !settled[i]);
  for (let attempt = 0; attempt < 2 && failed.length; attempt += 1) {
    await new Promise((r) => setTimeout(r, 1200));
    const retry = failed;
    failed = [];
    for (const n of retry) {
      const item = await fetchContest(modalityId, n).catch(() => null);
      if (item) results.push(item);
      else failed.push(n);
    }
  }
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
