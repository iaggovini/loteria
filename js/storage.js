import { DEFAULT_MODALITY } from './config.js';

const KEYS = {
  selection: 'loteria-selecao-v2',
  favorites: 'loteria-favoritos',
  theme: 'loteria-tema',
  modality: 'loteria-modalidade'
};

export function getTheme() {
  return localStorage.getItem(KEYS.theme) || 'dark';
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

export function saveSelection(modalityId, numbers) {
  localStorage.setItem(
    KEYS.selection,
    JSON.stringify({ modality: modalityId, numbers: [...numbers] })
  );
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
  localStorage.setItem(KEYS.favorites, JSON.stringify(list));
}
