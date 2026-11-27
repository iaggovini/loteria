import { DEFAULT_MODALITY } from './config.js';

const KEYS = {
  selection: 'loteria-selecao-v2',
  favorites: 'loteria-favoritos',
  theme: 'loteria-tema',
  modality: 'loteria-modalidade',
  pool: 'loteria-bolao',
  owner: 'loteria-dono'
};

export function getTheme() {
  let saved = null;
  try { saved = localStorage.getItem(KEYS.theme); } catch { /* ignora */ }
  if (saved === 'dark' || saved === 'light') return saved;
  // Sem escolha salva: segue o modo (claro/escuro) do aparelho.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function setTheme(theme) {
  localStorage.setItem(KEYS.theme, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function getModality() {
  return localStorage.getItem(KEYS.modality) || DEFAULT_MODALITY;
}

export function setModality(id) {
  localStorage.setItem(KEYS.modality, id);
}

export function loadSelection(modalityId, min, max, pick) {
  const raw = localStorage.getItem(KEYS.selection);
  if (!raw) return new Set();

  try {
    const data = JSON.parse(raw);
    if (data.modality !== modalityId) return new Set();

    const valid = (data.numbers || [])
      .map(Number)
      .filter(
        (n) =>
          Number.isInteger(n) &&
          n >= min &&
          n <= max &&
          !Number.isNaN(n)
      );

    const unique = [...new Set(valid)].slice(0, pick);
    return new Set(unique);
  } catch {
    localStorage.removeItem(KEYS.selection);
    return new Set();
  }
}

/* Trevos (+Milionária) salvos junto com a seleção principal. */
export function loadSelectionExtra(modalityId, min, max, pick) {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.selection) || 'null');
    if (!data || data.modality !== modalityId) return new Set();
    const valid = (data.extra || []).map(Number).filter((n) => Number.isInteger(n) && n >= min && n <= max);
    return new Set([...new Set(valid)].slice(0, pick));
  } catch {
    return new Set();
  }
}

export function saveSelection(modalityId, numbers, extra) {
  const data = { modality: modalityId, numbers: [...numbers] };
  if (extra?.size) data.extra = [...extra];
  try {
    localStorage.setItem(KEYS.selection, JSON.stringify(data));
  } catch { /* sem espaço ou bloqueado */ }
}

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(KEYS.favorites);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveFavorites(list) {
  const prev = loadFavorites();
  localStorage.setItem(KEYS.favorites, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('favorites:changed', { detail: { prev, next: list } }));
}

/* Escrita local sem disparar sincronização (usada ao baixar dados da nuvem). */
export function replaceFavorites(list) {
  localStorage.setItem(KEYS.favorites, JSON.stringify(list));
}

export function loadPoolRaw() {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.pool) || 'null');
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

export function savePoolRaw(data) {
  if (data) localStorage.setItem(KEYS.pool, JSON.stringify(data));
  else localStorage.removeItem(KEYS.pool);
}

/* Conta dona dos dados guardados neste navegador (null = criados sem login). */
export function getDataOwner() {
  return localStorage.getItem(KEYS.owner);
}

export function setDataOwner(userId) {
  if (userId) localStorage.setItem(KEYS.owner, userId);
  else localStorage.removeItem(KEYS.owner);
}
