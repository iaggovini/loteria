import { MODALITIES, DEFAULT_MODALITY } from './config.js';
import {
  getModality,
  setModality,
  getTheme,
  setTheme
} from './storage.js';
import {
  showToast,
  initMobileMenu,
  initThemeToggle,
  initScrollSpy,
  registerServiceWorker
} from './ui.js';
import {
  initResults,
  loadMoreResults,
  refreshResults,
  getHistory
} from './results.js';
import {
  initSimulator,
  switchModality,
  applyNumbers,
  getSelectedNumbers,
  parseUrlBet,
  clearSelection
} from './simulator.js';
import {
  initFavorites,
  renderFavoritesList,
  addFavorite,
  removeFavorite,
  getFavorite
} from './favorites.js';
import { initPool, switchPoolModality, addBetToPool } from './pool.js';

let currentModality = MODALITIES[getModality()] || MODALITIES[DEFAULT_MODALITY];

function initModalitySelector() {
  const select = document.getElementById('modalitySelect');
  if (!select) return;

  select.innerHTML = Object.values(MODALITIES)
    .map(
      (m) =>
        `<option value="${m.id}" ${m.id === currentModality.id ? 'selected' : ''}>${m.name}</option>`
    )
    .join('');

  select.addEventListener('change', () => {
    const id = select.value;
    if (!MODALITIES[id]) return;
    currentModality = MODALITIES[id];
    setModality(id);
    onModalityChange();
  });
}

function onModalityChange() {
  switchModality(currentModality);
  switchPoolModality(currentModality);
  initResults(currentModality);
  renderRules(currentModality);
  renderFavoritesList(handleFavoriteAction);
}

function renderRules(mod) {
  const rulesEl = document.getElementById('rulesContent');
  if (!rulesEl) return;

  const tiers = mod.prizeTiers.map((t) => `<li>${t.label}</li>`).join('');
  rulesEl.innerHTML = `
    <p>${mod.description} Sorteios: ${mod.drawDays}.</p>
    <p>Probabilidade (referência): jogar ${mod.pick} números na faixa completa — consulte o regulamento oficial para valores exatos.</p>
    <h3>Faixas de premiação</h3>
    <ul>${tiers}</ul>
    <p class="muted">Valide bilhetes apenas em casas credenciadas ou no site/app oficial da Caixa.</p>
  `;
}

function handleFavoriteAction(action, idOrName) {
  if (action === 'save') {
    const nums = getSelectedNumbers();
    if (nums.length !== currentModality.pick) {
      showToast(
        `Selecione ${currentModality.pick} números antes de salvar.`,
        'warning'
      );
      return;
    }
    addFavorite(currentModality, nums, idOrName);
    renderFavoritesList(handleFavoriteAction);
    return;
  }

  if (action === 'apply') {
    const fav = getFavorite(idOrName);
    if (!fav) return;
    if (fav.modalityId !== currentModality.id) {
      const select = document.getElementById('modalitySelect');
      if (select) select.value = fav.modalityId;
      currentModality = MODALITIES[fav.modalityId];
      setModality(fav.modalityId);
      onModalityChange();
    }
    applyNumbers(fav.numbers);
    showToast(`Aposta "${fav.name}" carregada.`, 'success');
    document.getElementById('simulador')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (action === 'remove') {
    removeFavorite(idOrName);
    renderFavoritesList(handleFavoriteAction);
  }
}

function applyUrlParams() {
  const bet = parseUrlBet();
  if (!bet || !MODALITIES[bet.modalityId]) return;

  const select = document.getElementById('modalitySelect');
  if (select) select.value = bet.modalityId;
  currentModality = MODALITIES[bet.modalityId];
  setModality(bet.modalityId);
  switchModality(currentModality);
  applyNumbers(bet.numbers);
  showToast('Aposta carregada do link compartilhado.', 'info');
}

function populateCompareSelects() {
  const history = getHistory();
  const a = document.getElementById('compareA');
  const b = document.getElementById('compareB');
  if (!a || !b || !history.length) return;

  const options = history
    .map((h) => `<option value="${h.contest}">Concurso ${h.contest} (${h.date})</option>`)
    .join('');

  a.innerHTML = options;
  b.innerHTML = options;
  if (history.length > 1) b.selectedIndex = 1;
}

function initCompare() {
  const btn = document.getElementById('btnCompare');
  const a = document.getElementById('compareA');
  const b = document.getElementById('compareB');
  const out = document.getElementById('compareResult');

  btn?.addEventListener('click', () => {
    const history = getHistory();
    const ca = Number(a?.value);
    const cb = Number(b?.value);
    const ra = history.find((h) => h.contest === ca);
    const rb = history.find((h) => h.contest === cb);

    if (!ra || !rb) {
      out.innerHTML = '<p class="state-message state-error">Selecione dois concursos listados nos resultados.</p>';
      return;
    }

    const setA = new Set(ra.balls);
    const common = rb.balls.filter((n) => setA.has(n));

    out.innerHTML = `
      <p>Concurso ${ra.contest} vs ${rb.contest}: <strong>${common.length}</strong> dezena(s) em comum.</p>
      <p>${common.length ? common.map((n) => String(n).padStart(2, '0')).join(', ') : 'Nenhuma dezena repetida entre os dois sorteios.'}</p>
    `;
  });
}

function init() {
  setTheme(getTheme());
  initMobileMenu();
  initThemeToggle(setTheme);
  initScrollSpy();
  registerServiceWorker();

  initModalitySelector();
  renderRules(currentModality);
  initSimulator(currentModality);
  initResults(currentModality, () => populateCompareSelects());

  initFavorites(handleFavoriteAction);
  initPool(currentModality);

  document.getElementById('btnAddToPool')?.addEventListener('click', () => {
    const nums = getSelectedNumbers();
    if (nums.length !== currentModality.pick) {
      showToast(`Selecione ${currentModality.pick} números para incluir no bolão.`, 'warning');
      return;
    }
    addBetToPool(nums);
    document.getElementById('bolao')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('loadMoreResults')?.addEventListener('click', async () => {
    await loadMoreResults();
    populateCompareSelects();
  });
  document.getElementById('btnRefreshResults')?.addEventListener('click', () =>
    refreshResults()
  );

  initCompare();
  applyUrlParams();
}

init();
