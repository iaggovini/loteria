import { formatNumber, getPrizeLabel, getExtraPrizeLabel } from './config.js';
import { loadSelection, saveSelection } from './storage.js';
import { showToast } from './ui.js';
import { getLatestResult } from './results.js';

let modality = null;
const selected = new Set();
const selectedExtra = new Set();
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
    desc: document.getElementById('simulatorDesc'),
    extraWrap: document.getElementById('extraGrid')
  });

  if (els.desc) {
    els.desc.textContent = modality.description;
  }

  bindActions(callbacks);
  restoreSelection();
  buildGrid();
  buildExtraSection();
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
  selectedExtra.clear();
  gridLocked = false;
  if (els.desc) els.desc.textContent = modality.description;
  restoreSelection();
  buildGrid();
  buildExtraSection();
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

function buildExtraSection() {
  if (!els.extraWrap) return;

  if (!modality.extra) {
    els.extraWrap.hidden = true;
    els.extraWrap.innerHTML = '';
    els.extraGrid = null;
    els.extraCounter = null;
    return;
  }

  const { label, min, max, pick } = modality.extra;
  els.extraWrap.hidden = false;
  els.extraWrap.innerHTML = `
    <div class="extra-head">
      <strong>${label}s</strong>
      <span id="extraCounter">0 / ${pick}</span>
    </div>
    <div class="numbers extra-numbers" id="extraNumberGrid"></div>
  `;

  els.extraGrid = document.getElementById('extraNumberGrid');
  els.extraCounter = document.getElementById('extraCounter');
  els.extraGrid.style.gridTemplateColumns = `repeat(${max - min + 1}, minmax(0, 1fr))`;

  for (let i = min; i <= max; i += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-btn extra-btn';
    button.textContent = String(i);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${label} ${i}, não selecionado`);
    button.addEventListener('click', () => toggleExtra(i, button));
    els.extraGrid.appendChild(button);
  }

  syncExtraGridClasses();
}

function toggleExtra(value) {
  const { pick, label } = modality.extra;
  if (selectedExtra.has(value)) {
    selectedExtra.delete(value);
  } else if (selectedExtra.size < pick) {
    selectedExtra.add(value);
  } else {
    showToast(`Selecione no máximo ${pick} ${label.toLowerCase()}s.`, 'warning');
    return;
  }
  syncExtraGridClasses();
  clearConference();
}

function syncExtraGridClasses() {
  if (!els.extraGrid || !modality.extra) return;
  const { pick, label } = modality.extra;
  els.extraGrid.querySelectorAll('.extra-btn').forEach((button) => {
    const value = Number(button.textContent);
    const isSelected = selectedExtra.has(value);
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
    button.setAttribute('aria-label', `${label} ${value}, ${isSelected ? 'selecionado' : 'não selecionado'}`);
    button.disabled = selectedExtra.size >= pick && !isSelected;
  });
  if (els.extraCounter) els.extraCounter.textContent = `${selectedExtra.size} / ${pick}`;
}

export function getSelectedExtra() {
  return [...selectedExtra].sort((a, b) => a - b);
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
  selectedExtra.clear();
  gridLocked = false;
  document.querySelectorAll('.number-btn').forEach((button) => {
    button.classList.remove('selected');
    button.disabled = false;
  });
  syncExtraGridClasses();
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

  if (modality.extra) {
    const { min, max, pick: extraPick } = modality.extra;
    const extraPool = [];
    for (let i = min; i <= max; i += 1) extraPool.push(i);
    selectedExtra.clear();
    while (selectedExtra.size < extraPick && extraPool.length) {
      const idx = Math.floor(Math.random() * extraPool.length);
      selectedExtra.add(extraPool.splice(idx, 1)[0]);
    }
    syncExtraGridClasses();
  }

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

  if (modality.extra && selectedExtra.size !== modality.extra.pick) {
    showToast(
      `Selecione exatamente ${modality.extra.pick} ${modality.extra.label.toLowerCase()}s para conferir.`,
      'warning'
    );
    return;
  }

  const nums = getSelectedNumbers();
  const draws =
    modality.multiDraw && latest.balls2
      ? [
          { label: '1º sorteio', balls: latest.balls },
          { label: '2º sorteio', balls: latest.balls2 }
        ]
      : [{ label: null, balls: latest.balls }];

  const drawResults = draws.map((d) => {
    const drawnSet = new Set(d.balls);
    return { ...d, drawnSet, hits: nums.filter((n) => drawnSet.has(n)) };
  });

  const best = drawResults.reduce((a, b) => (b.hits.length > a.hits.length ? b : a));

  let extraHitsCount = 0;
  let extraDrawnSet = new Set();
  if (modality.extra && latest.trevos) {
    extraDrawnSet = new Set(latest.trevos);
    extraHitsCount = getSelectedExtra().filter((n) => extraDrawnSet.has(n)).length;
  }

  const label = modality.extra
    ? getExtraPrizeLabel(modality, best.hits.length, extraHitsCount)
    : getPrizeLabel(modality, best.hits.length);

  if (box) {
    box.hidden = false;
    box.innerHTML = `
      <p><strong>Concurso ${latest.contest}</strong> (${latest.date})</p>
      ${drawResults
        .map(
          (d) => `
        <p class="conference-hits">${d.label ? `<strong>${d.label}:</strong> ` : ''}${d.hits.length} acerto(s): ${
            d.hits.length ? d.hits.map((n) => formatNumber(n, modality)).join(', ') : 'nenhum'
          }</p>
        <div class="balls conference-balls">
          ${nums
            .map((n) => {
              const hit = d.drawnSet.has(n);
              return `<span class="ball ${hit ? 'ball-hit' : 'ball-miss'}">${formatNumber(n, modality)}</span>`;
            })
            .join('')}
        </div>`
        )
        .join('')}
      ${
        modality.extra
          ? `
        <p class="conference-hits"><strong>${modality.extra.label}s:</strong> ${extraHitsCount} acerto(s)${latest.trevos ? '' : ' (sem dado de trevo neste concurso)'}</p>
        <div class="balls conference-balls">
          ${getSelectedExtra()
            .map((n) => {
              const hit = extraDrawnSet.has(n);
              return `<span class="ball ball-trevo ${hit ? 'ball-hit' : 'ball-miss'}">${n}</span>`;
            })
            .join('')}
        </div>`
          : ''
      }
      <p class="conference-tier">${label}</p>
    `;
  }

  showToast(`Conferência: ${best.hits.length} acerto(s).`, best.hits.length >= 4 ? 'success' : 'info');
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
