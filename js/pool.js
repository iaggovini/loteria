import { formatNumber, getPrizeLabel } from './config.js';
import { showToast } from './ui.js';
import { getLatestResult } from './results.js';

let modality = null;

const state = {
  modalityId: '',
  name: '',
  organizer: '',
  contestNumber: '',
  betPrice: 5,
  bets: [],
  participants: []
};

export function initPool(mod) {
  modality = mod;
  state.modalityId = mod.id;
  loadFromStorage();
  bindInputs();
  bindActions();
  restoreInputValues();
  render();
}

export function switchPoolModality(mod) {
  modality = mod;
  state.modalityId = mod.id;
  state.bets = [];
  saveToStorage();
  render();
}

export function addBetToPool(numbers) {
  if (!numbers.length) return false;
  state.bets.push({ id: crypto.randomUUID(), numbers: [...numbers] });
  saveToStorage();
  render();
  showToast('Aposta incluída no bolão.', 'success');
  return true;
}

function bindInputs() {
  const bind = (id, key, parse) => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      state[key] = parse ? parse(e.target.value) : e.target.value;
      saveToStorage();
      if (key === 'betPrice') renderSummary();
    });
  };
  bind('poolName', 'name');
  bind('poolOrganizer', 'organizer');
  bind('poolContest', 'contestNumber');
  bind('poolPrice', 'betPrice', (v) => Math.max(0, Number(v) || 0));
}

function bindActions() {
  document.getElementById('btnClearPool')?.addEventListener('click', () => {
    if (!state.bets.length) return;
    if (confirm('Limpar todas as apostas do bolão?')) {
      state.bets = [];
      saveToStorage();
      render();
      showToast('Apostas limpas.', 'info');
    }
  });

  document.getElementById('btnGenPoolBets')?.addEventListener('click', () => {
    const countEl = document.getElementById('poolGenCount');
    const count = Math.min(30, Math.max(1, Number(countEl?.value) || 5));
    for (let i = 0; i < count; i++) {
      state.bets.push({ id: crypto.randomUUID(), numbers: randomPick() });
    }
    saveToStorage();
    render();
    showToast(`${count} surpresinha(s) gerada(s).`, 'success');
  });

  document.getElementById('btnAddParticipant')?.addEventListener('click', addParticipant);
  document.getElementById('participantName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addParticipant();
  });

  document.getElementById('btnConferPool')?.addEventListener('click', conferPool);
  document.getElementById('btnPrintPool')?.addEventListener('click', printPool);
  document.getElementById('btnSharePool')?.addEventListener('click', sharePool);
  document.getElementById('btnCopyPool')?.addEventListener('click', copyPool);
}

function addParticipant() {
  const nameEl = document.getElementById('participantName');
  const cotasEl = document.getElementById('participantCotas');
  const name = nameEl?.value.trim();
  const shares = Math.max(1, Number(cotasEl?.value) || 1);

  if (!name) {
    showToast('Digite o nome do participante.', 'warning');
    return;
  }

  state.participants.push({ id: crypto.randomUUID(), name, shares });
  if (nameEl) nameEl.value = '';
  if (cotasEl) cotasEl.value = '1';
  saveToStorage();
  renderParticipants();
  renderSummary();
  showToast(`${name} adicionado(a).`, 'success');
  nameEl?.focus();
}

function restoreInputValues() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  set('poolName', state.name);
  set('poolOrganizer', state.organizer);
  set('poolContest', state.contestNumber);
  set('poolPrice', state.betPrice);
}

function randomPick() {
  const working = [];
  for (let i = modality.min; i <= modality.max; i++) working.push(i);
  const result = [];
  while (result.length < modality.pick) {
    const idx = Math.floor(Math.random() * working.length);
    result.push(working.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

function ballsHtml(numbers, hitSet) {
  return numbers
    .map((n) => {
      const fmt = formatNumber(n, modality);
      let cls = 'ball';
      if (hitSet) cls += hitSet.has(n) ? ' ball-hit' : ' ball-miss';
      return `<span class="${cls}">${fmt}</span>`;
    })
    .join('');
}

function render() {
  renderBets();
  renderParticipants();
  renderSummary();
  clearConference();
}

function renderBets() {
  const list = document.getElementById('poolBetsList');
  if (!list) return;

  if (!state.bets.length) {
    list.innerHTML =
      '<p class="state-message muted">Nenhuma aposta. Use o simulador ou gere surpresinhas acima.</p>';
    return;
  }

  list.innerHTML = `
    <p class="pool-bets-count">${state.bets.length} aposta(s) — ${modality.name}</p>
    ${state.bets
      .map(
        (bet, i) => `
      <article class="pool-bet-item">
        <span class="pool-bet-num">Aposta ${i + 1}</span>
        <div class="balls pool-bet-balls">${ballsHtml(bet.numbers)}</div>
        <button type="button" class="btn-sm btn-danger" data-bet-id="${bet.id}"
          aria-label="Remover aposta ${i + 1}">✕</button>
      </article>`
      )
      .join('')}
  `;

  list.querySelectorAll('[data-bet-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.bets = state.bets.filter((b) => b.id !== btn.dataset.betId);
      saveToStorage();
      render();
    });
  });
}

function renderParticipants() {
  const container = document.getElementById('participantsList');
  if (!container) return;

  if (!state.participants.length) {
    container.innerHTML =
      '<p class="state-message muted">Nenhum participante cadastrado.</p>';
    return;
  }

  const total = state.participants.reduce((s, p) => s + p.shares, 0);

  container.innerHTML = state.participants
    .map(
      (p, i) => `
    <div class="participant-item">
      <span class="participant-num">${i + 1}</span>
      <span class="participant-name">${escapeHtml(p.name)}</span>
      <span class="participant-shares muted">${p.shares} cota${p.shares > 1 ? 's' : ''}</span>
      <span class="participant-pct muted">${((p.shares / total) * 100).toFixed(0)}%</span>
      <button type="button" class="btn-sm btn-danger" data-part-id="${p.id}"
        aria-label="Remover ${escapeHtml(p.name)}">✕</button>
    </div>`
    )
    .join('');

  container.querySelectorAll('[data-part-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.participants = state.participants.filter(
        (p) => p.id !== btn.dataset.partId
      );
      saveToStorage();
      renderParticipants();
      renderSummary();
    });
  });
}

function renderSummary() {
  const container = document.getElementById('poolSummary');
  if (!container) return;

  if (!state.bets.length) {
    container.innerHTML = '';
    return;
  }

  const totalShares =
    state.participants.reduce((s, p) => s + p.shares, 0) || 1;
  const total = state.bets.length * state.betPrice;
  const perShare = total / totalShares;

  const participantBadges = state.participants.length
    ? `<div class="summary-participants">${state.participants
        .map((p) => {
          const cost = (p.shares / totalShares) * total;
          return `<span class="participant-badge"><strong>${escapeHtml(p.name)}</strong> R$&nbsp;${cost.toFixed(2)}</span>`;
        })
        .join('')}</div>`
    : '';

  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-val">${state.bets.length}</span>
        <span class="summary-lbl">Apostas</span>
      </div>
      <div class="summary-item">
        <span class="summary-val">R$&nbsp;${total.toFixed(2)}</span>
        <span class="summary-lbl">Total</span>
      </div>
      <div class="summary-item">
        <span class="summary-val">${totalShares}</span>
        <span class="summary-lbl">Cotas</span>
      </div>
      <div class="summary-item summary-highlight">
        <span class="summary-val">R$&nbsp;${perShare.toFixed(2)}</span>
        <span class="summary-lbl">Por cota</span>
      </div>
    </div>
    ${participantBadges}
  `;
}

function conferPool() {
  const latest = getLatestResult();
  const out = document.getElementById('poolConference');
  if (!out) return;

  if (!latest) {
    showToast('Carregue os resultados antes de conferir.', 'warning');
    return;
  }
  if (!state.bets.length) {
    showToast('Adicione apostas ao bolão antes de conferir.', 'warning');
    return;
  }

  const drawn = new Set(latest.balls);
  let bestHits = 0;

  const rows = state.bets.map((bet, i) => {
    const hits = bet.numbers.filter((n) => drawn.has(n));
    if (hits.length > bestHits) bestHits = hits.length;
    const label = getPrizeLabel(modality, hits.length);
    const minPrizeTier = modality.prizeTiers[modality.prizeTiers.length - 1]?.hits ?? 0;
    const isWinner = hits.length > 0 && hits.length >= minPrizeTier;

    return `
      <div class="confer-row${isWinner ? ' confer-winner' : ''}">
        <span class="confer-row-num">Aposta ${i + 1}</span>
        <div class="balls confer-balls">${ballsHtml(bet.numbers, drawn)}</div>
        <span class="confer-hits-label">${hits.length} acerto(s) — ${label}</span>
      </div>`;
  });

  out.hidden = false;
  out.innerHTML = `
    <h3>Conferência do Bolão</h3>
    <div class="confer-drawn">
      <span class="muted">Sorteio ${latest.contest} (${latest.date}):</span>
      <div class="balls">
        ${latest.balls
          .map((n) => `<span class="ball">${formatNumber(n, modality)}</span>`)
          .join('')}
      </div>
    </div>
    ${
      bestHits > 0
        ? `<p class="confer-best-msg">Melhor resultado do bolão: <strong>${bestHits} acerto(s)</strong></p>`
        : '<p class="muted confer-best-msg">Nenhum acerto neste bolão para este concurso.</p>'
    }
    <div class="confer-rows">${rows.join('')}</div>
  `;

  out.scrollIntoView({ behavior: 'smooth' });
}

function clearConference() {
  const out = document.getElementById('poolConference');
  if (out) {
    out.hidden = true;
    out.innerHTML = '';
  }
}

function buildPoolText() {
  const lines = [
    `🎰 ${state.name || 'Bolão'}`,
    state.organizer ? `Organizador: ${state.organizer}` : '',
    state.contestNumber ? `Concurso Nº: ${state.contestNumber}` : '',
    `Jogo: ${modality.name}`,
    `─────────────────────`,
  ].filter(Boolean);

  state.bets.forEach((bet, i) => {
    lines.push(
      `Aposta ${i + 1}: ${bet.numbers.map((n) => formatNumber(n, modality)).join(' - ')}`
    );
  });

  const total = state.bets.length * state.betPrice;
  lines.push(`─────────────────────`);
  lines.push(`Total: R$ ${total.toFixed(2)}`);

  if (state.participants.length) {
    const totalShares = state.participants.reduce((s, p) => s + p.shares, 0);
    lines.push(`Participantes:`);
    state.participants.forEach((p, i) => {
      const cost = (p.shares / totalShares) * total;
      lines.push(`  ${i + 1}. ${p.name} — R$ ${cost.toFixed(2)}`);
    });
  }

  return lines.join('\n');
}

function sharePool() {
  if (!state.bets.length) {
    showToast('Adicione apostas ao bolão antes de compartilhar.', 'warning');
    return;
  }
  const text = buildPoolText();
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

async function copyPool() {
  if (!state.bets.length) {
    showToast('Adicione apostas ao bolão antes de copiar.', 'warning');
    return;
  }
  const text = buildPoolText();
  try {
    await navigator.clipboard.writeText(text);
    showToast('Bolão copiado para a área de transferência.', 'success');
  } catch {
    window.prompt('Copie o texto do bolão:', text);
  }
}

function printPool() {
  if (!state.bets.length) {
    showToast('Adicione apostas ao bolão antes de imprimir.', 'warning');
    return;
  }

  const name = escapeHtml(state.name || 'Bolão');
  const total = state.bets.length * state.betPrice;
  const totalShares =
    state.participants.reduce((s, p) => s + p.shares, 0) || 1;

  const betsRows = state.bets
    .map(
      (bet, i) =>
        `<tr><td>${i + 1}</td><td>${bet.numbers.map((n) => formatNumber(n, modality)).join(' - ')}</td></tr>`
    )
    .join('');

  const participantsBlock = state.participants.length
    ? `<h3>Participantes</h3>
       <table>
         <thead><tr><th>#</th><th>Nome</th><th>Cotas</th><th>Valor</th></tr></thead>
         <tbody>
           ${state.participants
             .map((p, i) => {
               const cost = (p.shares / totalShares) * total;
               return `<tr><td>${i + 1}</td><td>${escapeHtml(p.name)}</td><td>${p.shares}</td><td>R$ ${cost.toFixed(2)}</td></tr>`;
             })
             .join('')}
         </tbody>
       </table>`
    : '';

  const metaItems = [
    state.organizer ? `Organizador: ${escapeHtml(state.organizer)}` : '',
    state.contestNumber ? `Concurso Nº: ${escapeHtml(state.contestNumber)}` : '',
    `Jogo: ${modality.name}`,
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Bolão — ${name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #000; max-width: 800px; margin: 0 auto; }
    h1 { margin: 0 0 6px; font-size: 1.6rem; }
    .meta { color: #555; margin-bottom: 28px; font-size: 0.9rem; }
    h3 { margin: 24px 0 10px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 0.9rem; }
    th { background: #f0f0f0; font-weight: 700; }
    tr:nth-child(even) td { background: #fafafa; }
    .summary-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; font-size: 0.95rem; }
    .summary-box strong { font-size: 1.1rem; }
    .disclaimer { font-size: 0.78rem; color: #999; margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <p class="meta">${metaItems}</p>

  <h3>Apostas</h3>
  <table>
    <thead><tr><th>Nº</th><th>Números</th></tr></thead>
    <tbody>${betsRows}</tbody>
  </table>

  <div class="summary-box">
    <strong>${state.bets.length}</strong> aposta(s) &times; R$ ${state.betPrice.toFixed(2)} =
    <strong>R$ ${total.toFixed(2)}</strong> total &nbsp;|&nbsp;
    Dividido em <strong>${totalShares}</strong> cota(s):
    <strong>R$ ${(total / totalShares).toFixed(2)}</strong> por cota
  </div>

  ${participantsBlock}

  <p class="disclaimer">Simulação — não válido como bilhete oficial. Resultados oficiais: Caixa Econômica Federal.</p>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    showToast('Permita popups para imprimir o bolão.', 'warning');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function saveToStorage() {
  localStorage.setItem('loteria-bolao', JSON.stringify({ ...state }));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('loteria-bolao');
    if (!raw) return;
    const data = JSON.parse(raw);
    state.name = data.name || '';
    state.organizer = data.organizer || '';
    state.contestNumber = data.contestNumber || '';
    state.betPrice = Number(data.betPrice) || 5;
    state.participants = Array.isArray(data.participants) ? data.participants : [];
    if (data.modalityId === modality.id && Array.isArray(data.bets)) {
      state.bets = data.bets;
    }
  } catch {
    /* ignore */
  }
}
