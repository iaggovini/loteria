import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_MODALITY, ModalityId } from '@/constants/modalities';

const KEYS = {
  selection: 'loteria-selecao-v2',
  favorites: 'loteria-favoritos',
  theme: 'loteria-tema',
  modality: 'loteria-modalidade',
  pool: 'loteria-bolao',
};

export type Theme = 'dark' | 'light';

export interface Favorite {
  id: string;
  name: string;
  modalityId: ModalityId;
  modalityName: string;
  numbers: number[];
  savedAt: string;
}

export async function getTheme(): Promise<Theme> {
  const value = await AsyncStorage.getItem(KEYS.theme);
  return value === 'light' ? 'light' : 'dark';
}

export async function setTheme(theme: Theme): Promise<void> {
  await AsyncStorage.setItem(KEYS.theme, theme);
}

export async function getModality(): Promise<ModalityId> {
  const value = await AsyncStorage.getItem(KEYS.modality);
  return (value as ModalityId) || DEFAULT_MODALITY;
}

export async function setModality(id: ModalityId): Promise<void> {
  await AsyncStorage.setItem(KEYS.modality, id);
}

export async function loadSelection(
  modalityId: ModalityId,
  min: number,
  max: number,
  pick: number
): Promise<number[]> {
  const raw = await AsyncStorage.getItem(KEYS.selection);
  if (!raw) return [];

  try {
    const data = JSON.parse(raw);
    if (data.modality !== modalityId) return [];

    const valid = (data.numbers || [])
      .map(Number)
      .filter((n: number) => Number.isInteger(n) && n >= min && n <= max);

    return [...new Set<number>(valid)].slice(0, pick);
  } catch {
    await AsyncStorage.removeItem(KEYS.selection);
    return [];
  }
}

export async function saveSelection(modalityId: ModalityId, numbers: number[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.selection, JSON.stringify({ modality: modalityId, numbers }));
}

export async function loadFavorites(): Promise<Favorite[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.favorites);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(list: Favorite[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(list));
}

export interface PoolBet {
  id: string;
  numbers: number[];
}

export interface PoolParticipant {
  id: string;
  name: string;
  shares: number;
}

export interface PoolState {
  modalityId: ModalityId;
  name: string;
  organizer: string;
  contestNumber: string;
  betPrice: number;
  bets: PoolBet[];
  participants: PoolParticipant[];
}

export async function loadPool(currentModalityId: ModalityId): Promise<Omit<PoolState, 'modalityId'>> {
  const empty = { name: '', organizer: '', contestNumber: '', betPrice: 5, bets: [], participants: [] };
  try {
    const raw = await AsyncStorage.getItem(KEYS.pool);
    if (!raw) return empty;
    const data = JSON.parse(raw);
    return {
      name: data.name || '',
      organizer: data.organizer || '',
      contestNumber: data.contestNumber || '',
      betPrice: Number(data.betPrice) || 5,
      participants: Array.isArray(data.participants) ? data.participants : [],
      bets: data.modalityId === currentModalityId && Array.isArray(data.bets) ? data.bets : [],
    };
  } catch {
    return empty;
  }
}

export async function savePool(state: PoolState): Promise<void> {
  await AsyncStorage.setItem(KEYS.pool, JSON.stringify(state));
}
