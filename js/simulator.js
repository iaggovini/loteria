import { formatNumber, getPrizeLabel } from './config.js';
import { loadSelection, saveSelection } from './storage.js';
import { showToast } from './ui.js';
import { getLatestResult } from './results.js';

let modality = null;
const selected = new Set();
let gridLocked = false;

const els = {};

export function initSimulator(mod, callbacks) {
  modality = mod;
  Object.assign(els, {
    grid: document.getElementById('numberGrid'),
    selected: document.getElementById('selectedNumbers'),
    counter: document.getElementById('selectionCounter'),
    progress: document.getElementById('selectionProgress'),
    conference: document.getElementById('conferenceResult'),
    desc: document.getElementById('simulatorDesc')
  });

  if (els.desc) {
    els.desc.textContent = modality.description;
  }

  bindActions(callbacks);
  restoreSelection();
  buildGrid();
  updateUI();
}

function bindActions(callbacks) {
  document.getElementById('btnQuickPick')?.addEventListener('click', () => generateQuickPick());
  document.getElementById('btnClear')?.addEventListener('click', () => clearSelection());
  document.getElementById('btnConference')?.addEventListener('click', () => runConference());
  document.getElementById('btnCopy')?.addEventListener('click', () => copyBet());
  document.getElementById('btnShare')?.addEventListener('click', () => shareBet());
  document.getElementById('btnPrint')?.addEventListener('click', () => window.print());

  ['filterEven', 'filterOdd', 'filterLow'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      const f = getFilters();
      if (f.onlyEven && f.onlyOdd) {
        showToast('Escolha apenas um filtro: pares ou ímpares.', 'warning');
        const el = document.getElementById(id);
        if (el) el.checked = false;
      }
    });
  });
}

export function switchModality(mod) {
  modality = mod;
  selected.clear();
  gridLocked = false;
  if (els.desc) els.desc.textContent = modality.description;
  restoreSelection();
  buildGrid();
  updateUI();
  clearConference();
}

function restoreSelection() {
  selected.clear();
  const saved = loadSelection(
    modality.id,
    modality.min,
    modality.max,
    modality.pick
  );
  saved.forEach((n) => selected.add(n));
}

function buildGrid() {
  if (!els.grid) return;

  els.grid.innerHTML = '';
  els.grid.style.gridTemplateColumns = `repeat(${modality.gridCols}, minmax(0, 1fr))`;

  for (let i = modality.min; i <= modality.max; i += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-btn';
    button.textContent = formatNumber(i, modality);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute(
      'aria-label',
      `Número ${formatNumber(i, modality)}, não selecionado`
    );
    button.addEventListener('click', () => toggleNumber(i, button));
    els.grid.appendChild(button);
  }

  syncGridClasses();
}

function syncGridClasses() {
  document.querySelectorAll('.number-btn').forEach((button) => {
    const value = Number(button.textContent);
    const isSelected = selected.has(value);
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
    button.setAttribute(
      'aria-label',
      `Número ${button.textContent}, ${isSelected ? 'selecionado' : 'não selecionado'}`
    );
    button.disabled = gridLocked && !isSelected;
  });
}

function updateUI() {
  const numbers = [...selected].sort((a, b) => a - b);
  const formatted = numbers.map((n) => formatNumber(n, modality));

  if (els.selected) {
    els.selected.textContent = formatted.length ? formatted.join(' - ') : 'Nenhum';
  }

  if (els.counter) {
    els.counter.textContent = `${selected.size} / ${modality.pick}`;
  }

  if (els.progress) {
    const pct = (selected.size / modality.pick) * 100;
    els.progress.style.width = `${pct}%`;
    els.progress.setAttribute('aria-valuenow', String(selected.size));
    els.progress.setAttribute('aria-valuemax', String(modality.pick));
  }

  gridLocked = selected.size >= modality.pick;
  syncGridClasses();
  saveSelection(modality.id, selected);
}

function toggleNumber(value, button) {
  if (selected.has(value)) {
    selected.delete(value);
    button.classList.remove('selected');
  } else if (selected.size < modality.pick) {
    selected.add(value);
    button.classList.add('selected');
  } else {
    showToast(
      `Você já selecionou ${modality.pick} números. Remova um ou limpe a seleção.`,
      'warning'
    );
    return;
  }

  updateUI();
  clearConference();
}

export function clearSelection() {
  selected.clear();
  gridLocked = false;
  document.querySelectorAll('.number-btn').forEach((button) => {
    button.classList.remove('selected');
    button.disabled = false;
  });
  updateUI();
  clearConference();
}

export function applyNumbers(numbers) {
  selected.clear();
  numbers
    .filter(
      (n) =>
        Number.isInteger(n) && n >= modality.min && n <= modality.max
    )
    .slice(0, modality.pick)
    .forEach((n) => selected.add(n));
  syncGridClasses();
  updateUI();
}

export function getSelectedNumbers() {
  return [...selected].sort((a, b) => a - b);
}

function getFilters() {
  return {
    onlyEven: document.getElementById('filterEven')?.checked,
    onlyOdd: document.getElementById('filterOdd')?.checked,
    rangeLow: document.getElementById('filterLow')?.checked
  };
}

function buildPool() {
  const { onlyEven, onlyOdd, rangeLow } = getFilters();
  const pool = [];

  for (let i = modality.min; i <= modality.max; i += 1) {
    if (onlyEven && i % 2 !== 0) continue;
    if (onlyOdd && i % 2 === 0) continue;
    if (rangeLow) {
      const mid = modality.min + Math.floor((modality.max - modality.min) / 2);
      if (i > mid) continue;
    }
    pool.push(i);
  }

  return pool.length >= modality.pick
    ? pool
    : Array.from(
        { length: modality.max - modality.min + 1 },
        (_, idx) => modality.min + idx
      );
}

export async function generateQuickPick() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pool = buildPool();
  const pick = [];
  const working = [...pool];

  clearSelection();

  if (!reduceMotion) {
    const buttons = [...document.querySelectorAll('.number-btn')];
    for (let round = 0; round < 12; round += 1) {
      buttons.forEach((btn) => btn.classList.toggle('shuffling', Math.random() > 0.7));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 40));
    }
    buttons.forEach((btn) => btn.classList.remove('shuffling'));
  }

  while (pick.length < modality.pick && working.length) {
    const idx = Math.floor(Math.random() * working.length);
    pick.push(working.splice(idx, 1)[0]);
  }

  applyNumbers(pick);
  showToast('Aposta gerada automaticamente.', 'success');
  clearConference();
}

function runConference() {
  const latest = getLatestResult();
  const box = els.conference;

  if (!latest) {
    showToast('Carregue os resultados antes de conferir.', 'warning');
    return;
  }

  if (selected.size !== modality.pick) {
    showToast(`Selecione exatamente ${modality.pick} números para conferir.`, 'warning');
    return;
  }

  const drawn = new Set(latest.balls);
  const hits = getSelectedNumbers().filter((n) => drawn.has(n));
  const label = getPrizeLabel(modality, hits.length);

  if (box) {
    box.hidden = false;
    box.innerHTML = `
      <p><strong>Concurso ${latest.contest}</strong> (${latest.date})</p>
      <p class="conference-hits">${hits.length} acerto(s): ${
        hits.length
          ? hits.map((n) => formatNumber(n, modality)).join(', ')
          : 'nenhum'
      }</p>
      <p class="conference-tier">${label}</p>
      <div class="balls conference-balls">
        ${getSelectedNumbers()
          .map((n) => {
            const hit = drawn.has(n);
            return `<span class="ball ${hit ? 'ball-hit' : 'ball-miss'}">${formatNumber(n, modality)}</span>`;
          })
          .join('')}
      </div>
    `;
  }

  showToast(`Conferência: ${hits.length} acerto(s).`, hits.length >= 4 ? 'success' : 'info');
}

function clearConference() {
  const box = els.conference;
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
}

async function copyBet() {
  const nums = getSelectedNumbers();
  if (!nums.length) {
    showToast('Nenhum número para copiar.', 'warning');
    return;
  }
  const text = nums.map((n) => formatNumber(n, modality)).join(' - ');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Números copiados.', 'success');
  } catch {
    showToast('Não foi possível copiar.', 'error');
  }
}

function shareBet() {
  const nums = getSelectedNumbers();
  if (!nums.length) {
    showToast('Selecione números antes de compartilhar.', 'warning');
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('jogo', modality.id);
  url.searchParams.set('n', nums.join(','));
  navigator.clipboard
    .writeText(url.toString())
    .then(() => showToast('Link da aposta copiado.', 'success'))
    .catch(() => {
      window.prompt('Copie o link da aposta:', url.toString());
    });
}

export function parseUrlBet() {
  const params = new URLSearchParams(window.location.search);
  const game = params.get('jogo');
  const nums = params.get('n');
  if (!game || !nums) return null;
  return {
    modalityId: game,
    numbers: nums.split(',').map(Number).filter((n) => !Number.isNaN(n))
  };
}
