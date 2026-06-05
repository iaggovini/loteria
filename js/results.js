import { formatNumber } from './config.js';
import { loadInitialHistory, loadMoreHistory } from './api.js';
import { renderStats } from './stats.js';

let history = [];
let dataSource = 'api';
let modalityId = 'megasena';
let modality = null;

export function initResults(mod, onLatest) {
  modality = mod;
  modalityId = mod.id;
  history = [];
  refreshResults(onLatest);
}

export async function refreshResults(onLatest) {
  const cards = document.getElementById('resultsCards');
  const statsEl = document.getElementById('statsPanel');
  const nextEl = document.getElementById('nextDrawInfo');
  const sourceEl = document.getElementById('dataSourceBadge');

  cards.innerHTML = '<p class="state-message" role="status">Carregando resultados…</p>';

  try {
    const { source, contests } = await loadInitialHistory(modalityId);
    dataSource = source;
    history = contests;

    if (sourceEl) {
      sourceEl.textContent =
        source === 'api'
          ? 'Fonte: API Caixa (tempo real)'
          : 'Fonte: dados locais (API indisponível)';
    }

    renderCards(cards);
    renderStats(statsEl, history, modality);
    updateNextDraw(nextEl, history[0]);
    onLatest?.(history[0]);

    const loadMoreBtn = document.getElementById('loadMoreResults');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = history.length === 0;
    }
  } catch (err) {
    cards.innerHTML = `<p class="state-message state-error" role="alert">Não foi possível carregar resultados. Tente novamente mais tarde.</p>`;
    if (statsEl) statsEl.innerHTML = '';
    if (nextEl) nextEl.textContent = '';
  }
}

function updateNextDraw(el, latest) {
  if (!el || !latest) {
    if (el) el.textContent = '';
    return;
  }

  const prize =
    latest.nextPrize != null
      ? latest.nextPrize.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })
      : '—';

  el.innerHTML = `
    <strong>Próximo sorteio</strong>
    <span>Concurso ${latest.nextContest ?? '—'} · ${latest.nextDate || 'data a confirmar'}</span>
    <span>Prêmio estimado: ${prize}</span>
    <a href="https://loterias.caixa.gov.br/Paginas/default.aspx" target="_blank" rel="noopener noreferrer">Site oficial Caixa ↗</a>
  `;
}

function renderCards(container) {
  container.innerHTML = '';

  history.forEach((result) => {
    const card = document.createElement('article');
    card.className = 'card result-card';
    card.dataset.contest = result.contest;
    card.innerHTML = `
      <div class="result-header">
        <strong>Concurso ${result.contest}</strong>
        <time datetime="${result.date}">${result.date}</time>
      </div>
      ${result.accumulated ? '<span class="badge badge-accumulated">Acumulou</span>' : ''}
      <div class="balls" aria-label="Dezenas sorteadas">
        ${result.balls
          .map(
            (ball) =>
              `<span class="ball">${formatNumber(ball, modality)}</span>`
          )
          .join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

export async function loadMoreResults() {
  if (!history.length) return;

  const oldest = history[history.length - 1].contest;
  const btn = document.getElementById('loadMoreResults');
  btn.disabled = true;
  btn.textContent = 'Carregando…';

  try {
    const { contests } = await loadMoreHistory(modalityId, oldest);
    const existing = new Set(history.map((h) => h.contest));
    const fresh = contests.filter((c) => !existing.has(c.contest));
    history = [...history, ...fresh];
    renderCards(document.getElementById('resultsCards'));
    renderStats(document.getElementById('statsPanel'), history, modality);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Carregar mais concursos';
  }
}

export function getLatestResult() {
  return history[0] || null;
}

export function getHistory() {
  return history;
}
