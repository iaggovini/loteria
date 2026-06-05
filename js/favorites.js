import { formatNumber } from './config.js';
import { loadFavorites, saveFavorites } from './storage.js';
import { showToast } from './ui.js';

export function initFavorites(onApply) {
  const saveBtn = document.getElementById('saveFavorite');
  const nameInput = document.getElementById('favoriteName');

  saveBtn?.addEventListener('click', () => {
    const name = nameInput?.value?.trim() || `Aposta ${new Date().toLocaleDateString('pt-BR')}`;
    onApply?.('save', name);
    if (nameInput) nameInput.value = '';
  });

  renderFavoritesList(onApply);
}

export function renderFavoritesList(onApply) {
  const list = document.getElementById('favoritesList');
  if (!list) return;

  const favorites = loadFavorites();
  if (!favorites.length) {
    list.innerHTML = '<p class="state-message muted">Nenhuma aposta favorita salva.</p>';
    return;
  }

  list.innerHTML = favorites
    .map(
      (fav) => `
      <article class="favorite-item" data-id="${fav.id}">
        <div>
          <strong>${escapeHtml(fav.name)}</strong>
          <span class="favorite-meta">${fav.modalityName} · ${fav.numbers
            .map((n) => String(n).padStart(2, '0'))
            .join(' - ')}</span>
        </div>
        <div class="favorite-actions">
          <button type="button" class="btn-sm" data-action="apply" data-id="${fav.id}">Usar</button>
          <button type="button" class="btn-sm btn-danger" data-action="remove" data-id="${fav.id}">Excluir</button>
        </div>
      </article>`
    )
    .join('');

  list.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      onApply?.(action, id);
    });
  });
}

export function addFavorite(modality, numbers, name) {
  const favorites = loadFavorites();
  const entry = {
    id: crypto.randomUUID(),
    name,
    modalityId: modality.id,
    modalityName: modality.name,
    numbers: [...numbers].sort((a, b) => a - b),
    savedAt: new Date().toISOString()
  };
  favorites.unshift(entry);
  saveFavorites(favorites.slice(0, 20));
  showToast('Aposta salva nos favoritos.', 'success');
  return entry;
}

export function removeFavorite(id) {
  const favorites = loadFavorites().filter((f) => f.id !== id);
  saveFavorites(favorites);
  showToast('Favorito removido.', 'info');
}

export function getFavorite(id) {
  return loadFavorites().find((f) => f.id === id);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
