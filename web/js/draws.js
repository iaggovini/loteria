/**
 * Próximos sorteios: faixa de últimos resultados, destaque do maior prêmio
 * e cards com prêmio estimado, data e contagem regressiva de cada modalidade.
 */
import { MODALITIES } from './config.js';
import { fetchLatest } from './api.js';

const TZ = 'America/Sao_Paulo';
// Os sorteios da Caixa são às 21h; aos domingos, às 11h (horário de Brasília).
const DRAW_HOUR = 21;
const SUNDAY_DRAW_HOUR = 11;

let latestByModality = {};
let timer = null;

const $ = (id) => document.getElementById(id);

const pad = (n) => String(n).padStart(2, '0');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatPrize(value) {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) <= 0) return null;
  const v = Number(value);
  if (v >= 1e9) return `R$ ${(v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${v >= 2e9 ? 'bilhões' : 'bilhão'}`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${v >= 2e6 ? 'milhões' : 'milhão'}`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// "dd/mm/aaaa" → instante do sorteio (horário de Brasília, UTC-3).
function drawInstant(dateStr) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr || '');
  if (!m) return null;
  const isSunday = new Date(Date.UTC(m[3], m[2] - 1, m[1])).getUTCDay() === 0;
  const hour = isSunday ? SUNDAY_DRAW_HOUR : DRAW_HOUR;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${pad(hour)}:00:00-03:00`);
}

const drawHourLabel = (instant) => `${new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: 'numeric' }).format(instant)}h`;

function brasiliaDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function dayLabel(instant, now = new Date()) {
  const today = brasiliaDay(now);
  const tomorrow = brasiliaDay(new Date(now.getTime() + 86400000));
  const day = brasiliaDay(instant);
  if (day === today) return 'Hoje';
  if (day === tomorrow) return 'Amanhã';
  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short' }).format(instant).replace('.', '');
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(instant);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date}`;
}

function countdownText(instant, now = new Date()) {
  const diff = instant.getTime() - now.getTime();
  if (diff <= 0) return diff > -3 * 3600000 ? 'Sorteio em andamento' : '';
  if (brasiliaDay(instant) !== brasiliaDay(now)) return '';
  const h = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `Faltam ${h}h ${pad(min)}min` : `Faltam ${min}min`;
}

function ballsHtml(numbers) {
  return numbers.map((n) => `<span class="ticker-ball">${pad(n)}</span>`).join('');
}

function renderTicker() {
  const track = $('tickerTrack');
  if (!track) return;
  const items = Object.values(MODALITIES)
    .map((mod) => [mod, latestByModality[mod.id]])
    .filter(([, data]) => data);
  if (!items.length) return;
  track.innerHTML = items.map(([mod, data]) => `
    <button type="button" class="ticker-item" data-accent="${mod.id}" data-show-results="${mod.id}"
      aria-label="${escapeHtml(`${mod.name}, concurso ${data.contest}: ${data.balls.join(', ')}${data.accumulated ? '. Acumulou' : ''}`)}">
      <span class="ticker-name"><span class="pill-dot"></span>${escapeHtml(mod.name)}</span>
      <span class="ticker-contest">${data.contest}</span>
      <span class="ticker-balls" aria-hidden="true">${ballsHtml(data.balls.slice(0, 15))}${data.balls.length > 15 ? '<span class="ticker-more">…</span>' : ''}</span>
      ${data.accumulated ? '<span class="draw-badge">Acumulou</span>' : ''}
    </button>`).join('');
  $('resultsTicker').hidden = false;
}

function renderHeroJackpot() {
  const box = $('heroJackpot');
  if (!box) return;
  const best = Object.values(latestByModality)
    .filter((d) => d && formatPrize(d.nextPrize))
    .sort((a, b) => Number(b.nextPrize) - Number(a.nextPrize))[0];
  if (!best) return;
  const mod = MODALITIES[best.modalityId];
  const instant = drawInstant(best.nextDate);
  box.dataset.accent = mod.id;
  box.innerHTML = `
    <p class="jackpot-kicker"><span class="pill-dot"></span>${escapeHtml(mod.name)} · Concurso ${best.nextContest || ''}</p>
    <p class="jackpot-label">Maior prêmio estimado</p>
    <p class="jackpot-value">${formatPrize(best.nextPrize)}</p>
    <p class="jackpot-date">${instant ? `${dayLabel(instant)}, às ${drawHourLabel(instant)}` : ''}${best.accumulated ? ' · <span class="draw-badge">Acumulou</span>' : ''}</p>
    <p class="jackpot-countdown" data-countdown="${escapeHtml(best.nextDate)}"></p>
    <div class="jackpot-actions">
      <button type="button" class="jackpot-primary" data-select-modality="${mod.id}">Simular aposta</button>
      <button type="button" class="jackpot-secondary" data-pool-modality="${mod.id}">Montar bolão</button>
    </div>`;
  box.hidden = false;
}

function renderCards() {
  const grid = $('drawCards');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('[data-draw-card]')];

  cards.forEach((card) => {
    const id = card.dataset.drawCard;
    const data = latestByModality[id];
    const info = card.querySelector('[data-draw-info]');
    const badge = card.querySelector('[data-draw-badge]');
    if (!info) return;
    if (!data) {
      info.innerHTML = '<p class="draw-unavailable">Prêmio indisponível no momento.</p>';
      return;
    }
    const prize = formatPrize(data.nextPrize);
    const instant = drawInstant(data.nextDate);
    if (badge) badge.hidden = !data.accumulated;
    info.innerHTML = `
      <p class="draw-label">Prêmio estimado</p>
      <p class="draw-prize">${prize || 'A divulgar'}</p>
      <p class="draw-meta">
        <span>${instant ? `${dayLabel(instant)} · ${drawHourLabel(instant)}` : 'Data a confirmar'}</span>
        ${data.nextContest ? `<span>Concurso ${data.nextContest}</span>` : ''}
      </p>
      <p class="draw-countdown" data-countdown="${escapeHtml(data.nextDate)}"></p>`;
  });

  // Ordena pelo próximo sorteio; no mesmo dia, o maior prêmio primeiro.
  cards
    .map((card) => {
      const data = latestByModality[card.dataset.drawCard];
      const t = data ? drawInstant(data.nextDate)?.getTime() : null;
      return { card, t: t ?? Infinity, prize: Number(data?.nextPrize) || 0 };
    })
    .sort((a, b) => a.t - b.t || b.prize - a.prize)
    .forEach(({ card }) => grid.appendChild(card));
}

function updateCountdowns() {
  const now = new Date();
  document.querySelectorAll('[data-countdown]').forEach((el) => {
    const instant = drawInstant(el.dataset.countdown);
    const text = instant ? countdownText(instant, now) : '';
    el.textContent = text;
    el.hidden = !text;
  });
}

export async function initDraws({ onSelect, onPool, onResults } = {}) {
  document.addEventListener('click', (event) => {
    const results = event.target.closest('[data-show-results]');
    if (results) { onResults?.(results.dataset.showResults); return; }
    const pool = event.target.closest('[data-pool-modality]');
    if (pool) { onPool?.(pool.dataset.poolModality); return; }
    // Os botões do destaque são criados depois do init de app.js, então são tratados aqui.
    const sim = event.target.closest('#heroJackpot [data-select-modality]');
    if (sim) onSelect?.(sim.dataset.selectModality);
  });

  const ids = Object.keys(MODALITIES);
  const settled = await Promise.allSettled(ids.map((id) => fetchLatest(id)));
  latestByModality = {};
  settled.forEach((r, i) => { if (r.status === 'fulfilled') latestByModality[ids[i]] = r.value; });

  renderTicker();
  renderHeroJackpot();
  renderCards();
  updateCountdowns();
  clearInterval(timer);
  timer = setInterval(updateCountdowns, 30000);
}
