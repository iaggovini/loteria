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
    list.innerHTML = '<div class="empty-state"><strong>Nenhum favorito salvo</strong><span>Escolha os números no simulador, dê um nome acima e salve para jogar de novo depois.</span></div>';
    return;
  }

  list.innerHTML = favorites
    .map(
      (fav) => `
      <article class="favorite-item" data-accent="${escapeHtml(fav.modalityId || '')}" data-id="${escapeHtml(fav.id)}">
        <div class="favorite-main">
          <div class="favorite-title">
            <strong>${escapeHtml(fav.name)}</strong>
            <span class="favorite-tag">${escapeHtml(fav.modalityName)}</span>
          </div>
          <div class="favorite-balls" aria-label="Números: ${(fav.numbers || []).map(Number).join(', ')}">${(fav.numbers || [])
            .map((n) => `<span class="fav-ball">${String(Number(n)).padStart(2, '0')}</span>`)
            .join('')}${(fav.extra || []).map((n) => `<span class="fav-ball fav-trevo" title="Trevo">${Number(n)}</span>`).join('')}</div>
        </div>
        <div class="favorite-actions">
          <button type="button" class="btn-sm fav-use" data-action="apply" data-id="${escapeHtml(fav.id)}">Usar no simulador</button>
          <button type="button" class="btn-sm btn-danger" data-action="remove" data-id="${escapeHtml(fav.id)}" aria-label="Excluir ${escapeHtml(fav.name)}">Excluir</button>
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

export const FAVORITES_LIMIT = 50; // o mesmo limite do banco (supabase/schema.sql)

export function addFavorite(modality, numbers, name, extra) {
  const favorites = loadFavorites();
  if (favorites.length >= FAVORITES_LIMIT) {
    showToast(`Você já tem ${FAVORITES_LIMIT} favoritos. Exclua algum para salvar um novo.`, 'warning');
    return null;
  }
  const entry = {
    id: crypto.randomUUID(),
    name,
    modalityId: modality.id,
    modalityName: modality.name,
    numbers: [...numbers].sort((a, b) => a - b),
    savedAt: new Date().toISOString()
  };
  if (extra?.length) entry.extra = [...extra].sort((a, b) => a - b);
  favorites.unshift(entry);
  saveFavorites(favorites);
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
