/*
 * Sincroniza favoritos e bolão com o Supabase quando há uma conta conectada.
 *
 * O localStorage continua sendo o cache local (o site funciona offline e sem
 * login). A chave "loteria-dono" indica a qual conta pertencem os dados locais:
 *  - dados sem dono (criados sem login) são enviados para a conta ao entrar;
 *  - dados de uma conta já sincronizada são substituídos pelos da nuvem;
 *  - ao sair, os dados da conta são apagados deste navegador.
 * O acesso é protegido por RLS (ver supabase/schema.sql).
 */
import { getClient } from './auth.js';
import {
  loadFavorites,
  replaceFavorites,
  loadPoolRaw,
  savePoolRaw,
  getDataOwner,
  setDataOwner
} from './storage.js';
import { showToast } from './ui.js';

const FAVORITES_LIMIT = 20;
const POOL_DELAY = 1000;

let userId = null;
let ready = false; // true depois da primeira sincronização da sessão
let poolTimer = null;
let warned = false;
let hooks = {};

export function initCloud(callbacks = {}) {
  hooks = callbacks;
  window.addEventListener('auth:user', (event) => handleUser(event.detail));
  window.addEventListener('favorites:changed', (event) => pushFavorites(event.detail));
  window.addEventListener('pool:changed', schedulePool);
  window.addEventListener('pagehide', flushPool);
}

async function handleUser(user) {
  const nextId = user?.id || null;
  if (nextId === userId) return;
  userId = nextId;
  ready = false;
  clearTimeout(poolTimer);

  if (!nextId) {
    // Saiu da conta (ou a sessão expirou): os dados dela não ficam expostos aqui.
    if (getDataOwner()) clearLocalData();
    return;
  }

  try {
    const supabase = await getClient();
    await syncFavorites(supabase, nextId);
    await syncPool(supabase, nextId);
    if (userId !== nextId) return; // trocou de conta no meio da sincronização
    setDataOwner(nextId);
    ready = true;
    hooks.onFavoritesLoaded?.();
  } catch {
    failed('Não foi possível sincronizar seus dados agora. Eles continuam salvos neste aparelho.');
  }
}

function clearLocalData() {
  replaceFavorites([]);
  savePoolRaw(null);
  setDataOwner(null);
  hooks.onFavoritesLoaded?.();
  hooks.onPoolLoaded?.(null);
}

/* ---------- Favoritos ---------- */

function toRow(fav, uid) {
  return {
    id: fav.id,
    user_id: uid,
    name: String(fav.name || 'Aposta').slice(0, 80),
    modality_id: fav.modalityId,
    modality_name: String(fav.modalityName || '').slice(0, 40),
    numbers: fav.numbers.map(Number),
    extra: fav.extra?.length ? fav.extra.map(Number) : null,
    saved_at: fav.savedAt || new Date().toISOString()
  };
}

function fromRow(row) {
  const fav = {
    id: row.id,
    name: row.name,
    modalityId: row.modality_id,
    modalityName: row.modality_name,
    numbers: row.numbers,
    savedAt: row.saved_at
  };
  if (row.extra?.length) fav.extra = row.extra;
  return fav;
}

async function syncFavorites(supabase, uid) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id, name, modality_id, modality_name, numbers, extra, saved_at')
    .order('saved_at', { ascending: false });
  if (error) throw error;

  const remote = data.map(fromRow);
  const owner = getDataOwner();
  let merged = remote;

  if (!owner) {
    // Favoritos criados sem login: junta com os da conta.
    const known = new Set(remote.map((f) => f.id));
    const local = loadFavorites().filter((f) => f.id && Array.isArray(f.numbers) && !known.has(f.id));
    merged = [...remote, ...local].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    const kept = merged.slice(0, FAVORITES_LIMIT);
    const keptIds = new Set(kept.map((f) => f.id));
    const upload = local.filter((f) => keptIds.has(f.id)).map((f) => toRow(f, uid));
    const extra = remote.filter((f) => !keptIds.has(f.id)).map((f) => f.id);
    if (upload.length) {
      const res = await supabase.from('favorites').upsert(upload);
      if (res.error) throw res.error;
    }
    if (extra.length) {
      const res = await supabase.from('favorites').delete().in('id', extra);
      if (res.error) throw res.error;
    }
    merged = kept;
  }

  replaceFavorites(merged);
}

async function pushFavorites({ prev = [], next = [] } = {}) {
  if (!ready || !userId) return;
  const prevIds = new Set(prev.map((f) => f.id));
  const nextIds = new Set(next.map((f) => f.id));
  const added = next.filter((f) => !prevIds.has(f.id)).map((f) => toRow(f, userId));
  const removed = prev.filter((f) => !nextIds.has(f.id)).map((f) => f.id);

  try {
    const supabase = await getClient();
    if (added.length) {
      const { error } = await supabase.from('favorites').upsert(added);
      if (error) throw error;
    }
    if (removed.length) {
      const { error } = await supabase.from('favorites').delete().in('id', removed);
      if (error) throw error;
    }
  } catch {
    failed('Não foi possível salvar o favorito na sua conta. Ele ficou guardado neste aparelho.');
  }
}

/* ---------- Bolão ---------- */

function hasContent(pool) {
  return !!pool && (
    (Array.isArray(pool.bets) && pool.bets.length > 0) ||
    (Array.isArray(pool.participants) && pool.participants.length > 0) ||
    !!pool.name
  );
}

async function syncPool(supabase, uid) {
  const { data, error } = await supabase.from('pools').select('data').maybeSingle();
  if (error) throw error;

  const local = loadPoolRaw();
  if (data && hasContent(data.data)) {
    savePoolRaw(data.data);
    hooks.onPoolLoaded?.(data.data);
  } else if (hasContent(local)) {
    await upsertPool(supabase, uid, local);
  }
}

async function upsertPool(supabase, uid, pool) {
  const { error } = await supabase
    .from('pools')
    .upsert({ user_id: uid, data: pool, updated_at: new Date().toISOString() });
  if (error) throw error;
}

function schedulePool() {
  if (!ready || !userId) return;
  clearTimeout(poolTimer);
  poolTimer = setTimeout(flushPool, POOL_DELAY);
}

async function flushPool() {
  if (!poolTimer) return;
  clearTimeout(poolTimer);
  poolTimer = null;
  if (!ready || !userId) return;
  const pool = loadPoolRaw(); // lê o estado mais recente no momento do envio
  if (!pool) return;
  try {
    await upsertPool(await getClient(), userId, pool);
  } catch {
    failed('Não foi possível salvar o bolão na sua conta. Ele ficou guardado neste aparelho.');
  }
}

function failed(message) {
  if (warned) return;
  warned = true; // avisa uma vez por sessão para não encher a tela de alertas
  showToast(message, 'warning');
}
