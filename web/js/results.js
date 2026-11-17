import { formatNumber, formatMoney, MODALITY_COLORS } from './config.js';
import { loadInitialHistory, loadMoreHistory } from './api.js';
import { renderStats } from './stats.js';
import { showToast } from './ui.js';

let history = [];
let dataSource = 'api';
let modalityId = 'megasena';
let modality = null;
let requestId = 0; // descarta respostas de uma modalidade que já foi trocada
let onLatestCallback = null;

export function initResults(mod, onLatest) {
  modality = mod;
  modalityId = mod.id;
  history = [];
  if (onLatest) onLatestCallback = onLatest;
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
    renderStats(statsEl, history, modality);
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

  history.forEach((result) => {
    const card = document.createElement('article');
    card.className = 'card result-card';
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
    `;
    container.appendChild(card);
  });
}

export async function loadMoreResults() {
  if (!history.length) return;

  const oldest = history[history.length - 1].contest;
  const current = requestId;
  const btn = document.getElementById('loadMoreResults');
  btn.disabled = true;
  btn.textContent = 'Carregando…';

  try {
    const { contests } = await loadMoreHistory(modalityId, oldest);
    if (current !== requestId) return;
    if (!contests.length) {
      showToast('Não há mais concursos disponíveis no momento.', 'info');
      return;
    }
    const existing = new Set(history.map((h) => h.contest));
    const fresh = contests.filter((c) => !existing.has(c.contest));
    history = [...history, ...fresh];
    renderCards(document.getElementById('resultsCards'));
    renderStats(document.getElementById('statsPanel'), history, modality);
  } catch {
    showToast('Não foi possível carregar mais concursos. Tente novamente.', 'error');
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
