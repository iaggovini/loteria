import { formatNumber, formatMoney, getPrizeLabel, getExtraPrizeLabel, findPrizeTier } from './config.js';
import { fetchContest } from './api.js';
import { showToast, showConfirm } from './ui.js';
import { getLatestResult } from './results.js';
import { loadPoolRaw, savePoolRaw } from './storage.js';

const TEMPLATES = {
  casal:    { name: 'Bolão Casal',        bets: 2  },
  familia:  { name: 'Bolão Família',      bets: 5  },
  trabalho: { name: 'Bolão do Trabalho',  bets: 10 },
  turma:    { name: 'Bolão da Turma',     bets: 15 },
  premium:  { name: 'Bolão Premium',      bets: 20 },
  grande:   { name: 'Bolão Grande',       bets: 30 },
};

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
  state.betPrice = mod.price;
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
  state.betPrice = mod.price;
  restoreInputValues();
  saveToStorage();
  render();
}

export function getPoolBetCount() {
  return state.bets.length;
}

export function addBetToPool(numbers, extra) {
  if (!numbers.length) return false;
  const bet = { id: crypto.randomUUID(), numbers: [...numbers] };
  if (extra && extra.length) bet.extra = [...extra];
  state.bets.push(bet);
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
  document.querySelectorAll('.pool-template-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const tpl = TEMPLATES[card.dataset.template];
      if (!tpl) return;

      if (state.bets.length > 0) {
        const ok = await showConfirm(`As ${state.bets.length} apostas atuais serão substituídas pelo modelo <strong>${tpl.name}</strong>.`, {
          title: 'Aplicar modelo?',
          confirmText: 'Aplicar',
          cancelText: 'Cancelar',
        });
        if (!ok) return;
      }

      state.bets = [];
      if (!state.name) {
        state.name = tpl.name;
        const nameEl = document.getElementById('poolName');
        if (nameEl) nameEl.value = tpl.name;
      }
      for (let i = 0; i < tpl.bets; i++) {
        state.bets.push(randomBet());
      }
      saveToStorage();
      render();
      showToast(`Modelo "${tpl.name}" aplicado — ${tpl.bets} apostas geradas.`, 'success');
    });
  });

  document.getElementById('btnClearPool')?.addEventListener('click', async () => {
    if (!state.bets.length) return;
    const ok = await showConfirm(`Remover todas as <strong>${state.bets.length} apostas</strong> do bolão?`, {
      title: 'Limpar bolão',
      confirmText: 'Limpar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (ok) {
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
      state.bets.push(randomBet());
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
  const shares = Math.min(1000, Math.max(1, Math.floor(Number(cotasEl?.value)) || 1));

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

function randomExtraPick() {
  if (!modality.extra) return undefined;
  const { min, max, pick } = modality.extra;
  const working = [];
  for (let i = min; i <= max; i++) working.push(i);
  const result = [];
  while (result.length < pick) {
    const idx = Math.floor(Math.random() * working.length);
    result.push(working.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

function randomBet() {
  const bet = { id: crypto.randomUUID(), numbers: randomPick() };
  const extra = randomExtraPick();
  if (extra) bet.extra = extra;
  return bet;
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

function extraHtml(numbers, hitSet) {
  if (!numbers || !numbers.length) return '';
  return numbers
    .map((n) => {
      let cls = 'ball ball-trevo';
      if (hitSet) cls += hitSet.has(n) ? ' ball-hit' : ' ball-miss';
      return `<span class="${cls}">${n}</span>`;
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
      '<div class="empty-state"><strong>Nenhuma aposta ainda</strong><span>Escolha um modelo, gere surpresinhas acima ou use "Incluir no bolão" no simulador.</span></div>';
    return;
  }

  list.innerHTML = `
    <p class="pool-bets-count">${state.bets.length} ${state.bets.length === 1 ? 'aposta' : 'apostas'} · ${modality.name}</p>
    <div class="pool-bets-grid">${state.bets
      .map(
        (bet, i) => `
      <article class="pool-bet-item">
        <span class="pool-bet-num">Aposta ${i + 1}</span>
        <div class="balls pool-bet-balls">${ballsHtml(bet.numbers)}${extraHtml(bet.extra)}</div>
        <button type="button" class="btn-sm btn-danger" data-bet-id="${bet.id}"
          aria-label="Remover aposta ${i + 1}">✕</button>
      </article>`
      )
      .join('')}</div>
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
          return `<span class="participant-badge"><strong>${escapeHtml(p.name)}</strong> ${formatMoney(cost)}</span>`;
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
        <span class="summary-val">${formatMoney(total)}</span>
        <span class="summary-lbl">Total</span>
      </div>
      <div class="summary-item">
        <span class="summary-val">${totalShares}</span>
        <span class="summary-lbl">Cotas</span>
      </div>
      <div class="summary-item summary-highlight">
        <span class="summary-val">${formatMoney(perShare)}</span>
        <span class="summary-lbl">Por cota</span>
      </div>
    </div>
    ${participantBadges}
  `;
}

async function conferPool() {
  const out = document.getElementById('poolConference');
  if (!out) return;

  if (!state.bets.length) {
    showToast('Adicione apostas ao bolão antes de conferir.', 'warning');
    return;
  }

  let latest = getLatestResult();
  if (latest && latest.modalityId !== modality.id) latest = null;
  const wanted = Number(String(state.contestNumber).trim());
  if (Number.isInteger(wanted) && wanted > 0 && wanted !== latest?.contest) {
    if (latest && wanted > latest.contest) {
      showToast(`O concurso ${wanted} ainda não foi sorteado. O último é o ${latest.contest}.`, 'info');
      return;
    }
    try {
      latest = await fetchContest(modality.id, wanted);
    } catch {
      showToast(`Não foi possível buscar o concurso ${wanted}. Verifique o número e tente novamente.`, 'warning');
      return;
    }
  }
  if (!latest) {
    showToast('Aguarde o carregamento dos resultados para conferir.', 'warning');
    return;
  }

  const draws = modality.multiDraw && latest.balls2 ? [latest.balls, latest.balls2] : [latest.balls];
  const drawnSets = draws.map((b) => new Set(b));
  const extraDrawnSet = modality.extra && latest.trevos ? new Set(latest.trevos) : null;

  let bestHits = 0;
  let winners = 0;

  const rows = state.bets.map((bet, i) => {
    const hitsPerDraw = drawnSets.map((s) => bet.numbers.filter((n) => s.has(n)).length);
    hitsPerDraw.forEach((h) => { if (h > bestHits) bestHits = h; });
    // Na Dupla Sena cada sorteio paga separado: destaca dezenas acertadas em qualquer um.
    const drawnSet = new Set(draws.flat());

    const extraHits = modality.extra && bet.extra && extraDrawnSet
      ? bet.extra.filter((n) => extraDrawnSet.has(n))
      : [];

    const labelFor = (h) => (modality.extra
      ? getExtraPrizeLabel(modality, h, extraHits.length)
      : getPrizeLabel(modality, h));
    const label = hitsPerDraw.length > 1
      ? hitsPerDraw.map((h, d) => `${d + 1}º sorteio: ${labelFor(h)}`).join(' · ')
      : labelFor(hitsPerDraw[0]);
    const isWinner = hitsPerDraw.some((h) => Boolean(findPrizeTier(modality, h, extraHits.length)));
    if (isWinner) winners += 1;

    return `
      <div class="confer-row${isWinner ? ' confer-winner' : ''}">
        <span class="confer-row-num">Aposta ${i + 1}</span>
        <div class="balls confer-balls">${ballsHtml(bet.numbers, drawnSet)}${extraHtml(bet.extra, extraDrawnSet)}</div>
        <span class="confer-hits-label">${isWinner ? '🏆 ' : ''}${escapeHtml(label)}</span>
      </div>`;
  });

  out.hidden = false;
  out.innerHTML = `
    <h3>Conferência do Bolão</h3>
    <div class="confer-drawn">
      <span class="muted">Concurso ${Number(latest.contest)} (${escapeHtml(latest.date)}):</span>
      <div class="balls">
        ${latest.balls
          .map((n) => `<span class="ball">${formatNumber(n, modality)}</span>`)
          .join('')}
      </div>
      ${
        latest.balls2
          ? `<div class="balls">${latest.balls2.map((n) => `<span class="ball">${formatNumber(n, modality)}</span>`).join('')}</div>`
          : ''
      }
      ${
        latest.trevos
          ? `<div class="balls">${latest.trevos.map((n) => `<span class="ball ball-trevo">${n}</span>`).join('')}</div>`
          : ''
      }
    </div>
    ${
      winners > 0
        ? `<p class="confer-best-msg confer-best-win">🎉 <strong>${winners} ${winners === 1 ? 'aposta premiada' : 'apostas premiadas'}</strong> neste concurso. Confirme sempre no site oficial da Caixa.</p>`
        : `<p class="muted confer-best-msg">Nenhuma aposta premiada neste concurso. Melhor resultado: ${bestHits} ${bestHits === 1 ? 'acerto' : 'acertos'}.</p>`
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
    const trevoText = bet.extra?.length ? ` + trevos ${bet.extra.join(' - ')}` : '';
    lines.push(
      `Aposta ${i + 1}: ${bet.numbers.map((n) => formatNumber(n, modality)).join(' - ')}${trevoText}`
    );
  });

  const total = state.bets.length * state.betPrice;
  lines.push(`─────────────────────`);
  lines.push(`Total: ${formatMoney(total)}`);

  if (state.participants.length) {
    const totalShares = state.participants.reduce((s, p) => s + p.shares, 0);
    lines.push(`Participantes:`);
    state.participants.forEach((p, i) => {
      const cost = (p.shares / totalShares) * total;
      lines.push(`  ${i + 1}. ${p.name} — ${formatMoney(cost)}`);
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
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
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
    .map((bet, i) => {
      const trevoText = bet.extra?.length ? ` <em>+ trevos ${bet.extra.join(' - ')}</em>` : '';
      return `<tr><td>${i + 1}</td><td>${bet.numbers.map((n) => formatNumber(n, modality)).join(' - ')}${trevoText}</td></tr>`;
    })
    .join('');

  const participantsBlock = state.participants.length
    ? `<h3>Participantes</h3>
       <table>
         <thead><tr><th>#</th><th>Nome</th><th>Cotas</th><th>Valor</th></tr></thead>
         <tbody>
           ${state.participants
             .map((p, i) => {
               const cost = (p.shares / totalShares) * total;
               return `<tr><td>${i + 1}</td><td>${escapeHtml(p.name)}</td><td>${p.shares}</td><td>${formatMoney(cost)}</td></tr>`;
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
  <link rel="stylesheet" href="${new URL('css/pool-print.css', location.href).href}">
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
    <strong>${state.bets.length}</strong> aposta(s) &times; ${formatMoney(state.betPrice)} =
    <strong>${formatMoney(total)}</strong> total &nbsp;|&nbsp;
    Dividido em <strong>${totalShares}</strong> cota(s):
    <strong>${formatMoney(total / totalShares)}</strong> por cota
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
  // Espera o CSS carregar para não imprimir a página sem formatação.
  const link = win.document.querySelector('link[rel="stylesheet"]');
  let printed = false;
  const doPrint = () => { if (!printed) { printed = true; win.print(); } };
  link?.addEventListener('load', doPrint);
  link?.addEventListener('error', doPrint);
  setTimeout(doPrint, 1500);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function saveToStorage() {
  savePoolRaw({ ...state });
  window.dispatchEvent(new CustomEvent('pool:changed'));
}

/* Recarrega o bolão do armazenamento local (após sincronizar ou sair da conta). */
export function reloadPool() {
  if (!modality) return;
  Object.assign(state, {
    modalityId: modality.id, name: '', organizer: '', contestNumber: '',
    betPrice: modality.price, bets: [], participants: []
  });
  loadFromStorage();
  restoreInputValues();
  render();
}

function loadFromStorage() {
  try {
    const data = loadPoolRaw();
    if (!data) return;
    state.name = data.name || '';
    state.organizer = data.organizer || '';
    state.contestNumber = data.contestNumber || '';
    state.participants = Array.isArray(data.participants) ? data.participants : [];
    // O preço salvo só vale para o mesmo jogo; em outro jogo, usa o preço oficial dele.
    if (data.modalityId === modality.id) {
      state.betPrice = Number(data.betPrice) || modality.price;
      if (Array.isArray(data.bets)) state.bets = data.bets;
    }
  } catch {
    /* ignore */
  }
}
