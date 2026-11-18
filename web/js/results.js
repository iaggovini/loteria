import { formatNumber, formatMoney, MODALITY_COLORS } from './config.js';
import { loadInitialHistory, loadMoreHistory, fetchContestsCached } from './api.js';
import { renderStats } from './stats.js';
import { showToast } from './ui.js';

let history = [];
let dataSource = 'api';
let modalityId = 'megasena';
let modality = null;
let requestId = 0; // descarta respostas de uma modalidade que já foi trocada
let onLatestCallback = null;
const STATS_SIZES = [10, 20, 50, 100];
let statsSize = readStatsSize();
let statsRun = 0;
let statsBound = false;

function readStatsSize() {
  try {
    const n = Number(localStorage.getItem('bds-stats-size'));
    return STATS_SIZES.includes(n) ? n : 20;
  } catch {
    return 20;
  }
}

export function initResults(mod, onLatest) {
  modality = mod;
  modalityId = mod.id;
  history = [];
  if (onLatest) onLatestCallback = onLatest;
  bindStatsRange();
  return refreshResults();
}

export async function refreshResults() {
  const current = ++requestId;
  const cards = document.getElementById('resultsCards');
  const statsEl = document.getElementById('statsPanel');
  const nextEl = document.getElementById('nextDrawInfo');
  const sourceEl = document.getElementById('dataSourceBadge');

  cards.innerHTML = '<p class="state-message" role="status">Carregando resultados…</p>';

  try {
    const { source, contests } = await loadInitialHistory(modalityId);
    if (current !== requestId) return;
    dataSource = source;
    history = contests;

    if (sourceEl) {
      sourceEl.textContent =
        source === 'api'
          ? 'Fonte: API Caixa (tempo real)'
          : 'Fonte: dados locais (API indisponível)';
    }

    renderCards(cards);
    updateStats();
    updateNextDraw(nextEl, history[0]);
    onLatestCallback?.(history[0]);

    const loadMoreBtn = document.getElementById('loadMoreResults');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = history.length === 0;
    }
  } catch (err) {
    if (current !== requestId) return;
    history = [];
    cards.innerHTML = `<p class="state-message state-error" role="alert">Não foi possível carregar resultados. Tente novamente mais tarde.</p>`;
    if (statsEl) statsEl.innerHTML = '';
    setStatsStatus('');
    if (nextEl) nextEl.textContent = '';
  }
}

function updateNextDraw(el, latest) {
  if (!el || !latest) {
    if (el) el.textContent = '';
    return;
  }

  const prize = latest.nextPrize != null ? formatMoney(latest.nextPrize) : '—';

  el.innerHTML = `
    <strong>Próximo sorteio</strong>
    <span>Concurso ${escapeHtml(latest.nextContest ?? '—')} · ${escapeHtml(latest.nextDate || 'data a confirmar')}</span>
    <span>Prêmio estimado: ${prize}</span>
    <a href="https://loterias.caixa.gov.br/Paginas/default.aspx" target="_blank" rel="noopener noreferrer">Site oficial Caixa ↗</a>
  `;
}

function renderCards(container) {
  container.innerHTML = '';

  history.forEach((result, index) => {
    const card = document.createElement('article');
    const featured = index === 0;
    card.className = `card result-card${featured ? ' result-featured' : ''}`;
    card.dataset.contest = result.contest;
    card.style.setProperty('--accent', MODALITY_COLORS[modality.id] || 'var(--primary)');

    const secondDraw = result.balls2
      ? `
      <p class="result-draw-label">2º sorteio</p>
      <div class="balls" aria-label="Dezenas sorteadas no segundo sorteio">
        ${result.balls2
          .map((ball) => `<span class="ball">${formatNumber(ball, modality)}</span>`)
          .join('')}
      </div>`
      : '';

    const trevos = result.trevos
      ? `
      <p class="result-draw-label">Trevos</p>
      <div class="balls" aria-label="Trevos sorteados">
        ${result.trevos.map((t) => `<span class="ball ball-trevo">${t}</span>`).join('')}
      </div>`
      : '';

    card.innerHTML = `
      <div class="result-header">
        <strong>Concurso ${escapeHtml(result.contest)}</strong>
        <time datetime="${isoDate(result.date)}">${escapeHtml(result.date)}</time>
      </div>
      ${result.accumulated ? '<span class="badge badge-accumulated">Acumulou</span>' : ''}
      ${result.balls2 ? '<p class="result-draw-label">1º sorteio</p>' : ''}
      <div class="balls" aria-label="Dezenas sorteadas">
        ${result.balls
          .map(
            (ball) =>
              `<span class="ball">${formatNumber(ball, modality)}</span>`
          )
          .join('')}
      </div>
      ${secondDraw}
      ${trevos}
      ${featured ? featuredDetails(result) : ''}
    `;
    container.appendChild(card);
  });
}

function setStatsStatus(text) {
  const el = document.getElementById('statsStatus');
  if (el) el.textContent = text;
}

function bindStatsRange() {
  if (statsBound) return;
  statsBound = true;
  document.querySelectorAll('[data-stats-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.statsSize);
      if (!STATS_SIZES.includes(n) || n === statsSize) return;
      statsSize = n;
      try { localStorage.setItem('bds-stats-size', String(n)); } catch { /* ignora */ }
      updateStats();
    });
  });
}

function syncStatsRange(busy) {
  document.querySelectorAll('[data-stats-size]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.statsSize) === statsSize));
    btn.disabled = busy;
  });
}

// Estatísticas dos últimos `statsSize` concursos (busca os que faltam).
async function updateStats() {
  const run = ++statsRun;
  const req = requestId;
  const statsEl = document.getElementById('statsPanel');
  if (!statsEl || !history.length) return;

  if (dataSource !== 'api') {
    syncStatsRange(true);
    renderStats(statsEl, history, modality);
    setStatsStatus(`Serviço da Caixa indisponível: análise feita com ${history.length} concursos salvos.`);
    return;
  }

  const latest = history[0].contest;
  const numbers = [];
  for (let i = 0; i < statsSize && latest - i >= 1; i += 1) numbers.push(latest - i);
  const known = new Map(history.map((h) => [h.contest, h]));
  const missing = numbers.filter((n) => !known.has(n));

  syncStatsRange(true);
  statsEl.classList.add('is-loading');
  try {
    const fetched = await fetchContestsCached(modalityId, missing, (done, total) => {
      if (run === statsRun && total) setStatsStatus(`Carregando concursos… ${done} de ${total}`);
    });
    if (run !== statsRun || req !== requestId) return;
    const all = [...numbers.map((n) => known.get(n)).filter(Boolean), ...fetched]
      .sort((a, b) => b.contest - a.contest);
    renderStats(statsEl, all, modality);
    const range = all.length > 1 ? ` (concursos ${all[all.length - 1].contest} a ${all[0].contest})` : '';
    const partial = all.length < numbers.length ? ` Alguns concursos não puderam ser carregados agora.` : '';
    setStatsStatus(`Análise dos últimos ${all.length} concursos${range}.${partial}`);
  } finally {
    if (run === statsRun) {
      statsEl.classList.remove('is-loading');
      syncStatsRange(false);
    }
  }
}

export async function loadMoreResults() {
  if (!history.length) return;

  const oldest = history[history.length - 1].contest;
  const current = requestId;
  const btn = document.getElementById('loadMoreResults');
  btn.disabled = true;
  btn.textContent = 'Carregando…';

  try {
    const { contests } = await loadMoreHistory(modalityId, oldest, 8);
    if (current !== requestId) return;
    if (!contests.length) {
      showToast('Não há mais concursos disponíveis no momento.', 'info');
      return;
    }
    const existing = new Set(history.map((h) => h.contest));
    const fresh = contests.filter((c) => !existing.has(c.contest));
    history = [...history, ...fresh];
    renderCards(document.getElementById('resultsCards'));
  } catch {
    showToast('Não foi possível carregar mais concursos. Tente novamente.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Carregar mais concursos';
  }
}

// Rateio e local dos ganhadores, mostrados só no concurso mais recente.
function featuredDetails(result) {
  const prizes = Array.isArray(result.prizes) ? result.prizes : [];
  const places = Array.isArray(result.winnerPlaces) ? result.winnerPlaces : [];
  if (!prizes.length && !result.locality) return '';

  const rows = prizes.map((p) => `
    <tr>
      <th scope="row">${escapeHtml(p.label)}</th>
      <td>${p.winners ? p.winners.toLocaleString('pt-BR') : '<span class="muted">Nenhum</span>'}</td>
      <td>${p.winners ? formatMoney(p.value) : '—'}</td>
    </tr>`).join('');

  const placeList = places.slice(0, 6).map((p) => {
    const where = p.online ? 'Canal eletrônico' : [p.city, p.uf].filter(Boolean).join('/');
    return `<li>${escapeHtml(where)}${p.winners > 1 ? ` (${p.winners})` : ''}</li>`;
  }).join('');

  return `
    <div class="result-prizes">
      ${rows ? `
      <table class="prize-table">
        <caption>Premiação</caption>
        <thead><tr><th scope="col">Faixa</th><th scope="col">Ganhadores</th><th scope="col">Prêmio</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : ''}
      ${placeList ? `<p class="result-places-title">Onde saiu o prêmio principal</p><ul class="result-places">${placeList}</ul>` : ''}
      ${result.locality ? `<p class="result-local">Sorteio realizado em ${escapeHtml(result.locality)}.</p>` : ''}
    </div>`;
}

export function getLatestResult() {
  return history[0] || null;
}

export function getHistory() {
  return history;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "16/11/2026" -> "2026-11-16" (formato exigido pelo atributo datetime)
function isoDate(date) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(date));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
