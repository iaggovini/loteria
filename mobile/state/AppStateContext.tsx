import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_MODALITY, MODALITIES, Modality, ModalityId } from '@/constants/modalities';
import { Contest, loadInitialHistory, loadMoreHistory } from '@/services/api';
import * as storage from '@/services/storage';
import { Favorite, Theme } from '@/services/storage';

interface AppStateValue {
  ready: boolean;
  modality: Modality;
  setModalityId: (id: ModalityId) => void;
  theme: Theme;
  toggleTheme: () => void;
  history: Contest[];
  dataSource: 'api' | 'local';
  loadingResults: boolean;
  refreshResults: () => Promise<void>;
  loadMoreResults: () => Promise<void>;
  selected: number[];
  toggleNumber: (n: number) => void;
  clearSelection: () => void;
  applyNumbers: (numbers: number[]) => void;
  favorites: Favorite[];
  addFavorite: (name: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  applyFavorite: (favorite: Favorite) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [modalityId, setModalityIdState] = useState<ModalityId>(DEFAULT_MODALITY);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [history, setHistory] = useState<Contest[]>([]);
  const [dataSource, setDataSource] = useState<'api' | 'local'>('api');
  const [loadingResults, setLoadingResults] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const modality = MODALITIES[modalityId];

  useEffect(() => {
    (async () => {
      const [savedTheme, savedModalityId, savedFavorites] = await Promise.all([
        storage.getTheme(),
        storage.getModality(),
        storage.loadFavorites(),
      ]);
      const mod = MODALITIES[savedModalityId];
      const savedSelection = await storage.loadSelection(savedModalityId, mod.min, mod.max, mod.pick);

      setThemeState(savedTheme);
      setModalityIdState(savedModalityId);
      setFavorites(savedFavorites);
      setSelected(savedSelection);
      setReady(true);
    })();
  }, []);

  const refreshResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const { source, contests } = await loadInitialHistory(modalityId);
      setDataSource(source);
      setHistory(contests);
    } finally {
      setLoadingResults(false);
    }
  }, [modalityId]);

  useEffect(() => {
    if (!ready) return;
    refreshResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, modalityId]);

  const loadMoreResults = useCallback(async () => {
    if (!history.length) return;
    const oldest = history[history.length - 1].contest;
    const { contests } = await loadMoreHistory(modalityId, oldest);
    setHistory((prev) => {
      const existing = new Set(prev.map((h) => h.contest));
      const fresh = contests.filter((c) => !existing.has(c.contest));
      return [...prev, ...fresh];
    });
  }, [history, modalityId]);

  const setModalityId = useCallback((id: ModalityId) => {
    setModalityIdState(id);
    storage.setModality(id);
    (async () => {
      const mod = MODALITIES[id];
      const saved = await storage.loadSelection(id, mod.min, mod.max, mod.pick);
      setSelected(saved);
    })();
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      storage.setTheme(next);
      return next;
    });
  }, []);

  const toggleNumber = useCallback(
    (n: number) => {
      setSelected((prev) => {
        let next: number[];
        if (prev.includes(n)) {
          next = prev.filter((v) => v !== n);
        } else if (prev.length < modality.pick) {
          next = [...prev, n].sort((a, b) => a - b);
        } else {
          return prev;
        }
        storage.saveSelection(modalityId, next);
        return next;
      });
    },
    [modality.pick, modalityId]
  );

  const clearSelection = useCallback(() => {
    setSelected([]);
    storage.saveSelection(modalityId, []);
  }, [modalityId]);

  const applyNumbers = useCallback(
    (numbers: number[]) => {
      const valid = numbers
        .filter((n) => Number.isInteger(n) && n >= modality.min && n <= modality.max)
        .slice(0, modality.pick)
        .sort((a, b) => a - b);
      setSelected(valid);
      storage.saveSelection(modalityId, valid);
    },
    [modality.min, modality.max, modality.pick, modalityId]
  );

  const addFavorite = useCallback(
    async (name: string) => {
      const entry: Favorite = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        modalityId,
        modalityName: modality.name,
        numbers: [...selected].sort((a, b) => a - b),
        savedAt: new Date().toISOString(),
      };
      const next = [entry, ...favorites].slice(0, 20);
      setFavorites(next);
      await storage.saveFavorites(next);
    },
    [favorites, modality.name, modalityId, selected]
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      const next = favorites.filter((f) => f.id !== id);
      setFavorites(next);
      await storage.saveFavorites(next);
    },
    [favorites]
  );

  const applyFavorite = useCallback((favorite: Favorite) => {
    setModalityIdState(favorite.modalityId);
    storage.setModality(favorite.modalityId);

    const mod = MODALITIES[favorite.modalityId];
    const valid = favorite.numbers
      .filter((n) => Number.isInteger(n) && n >= mod.min && n <= mod.max)
      .slice(0, mod.pick)
      .sort((a, b) => a - b);

    setSelected(valid);
    storage.saveSelection(favorite.modalityId, valid);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      modality,
      setModalityId,
      theme,
      toggleTheme,
      history,
      dataSource,
      loadingResults,
      refreshResults,
      loadMoreResults,
      selected,
      toggleNumber,
      clearSelection,
      applyNumbers,
      favorites,
      addFavorite,
      removeFavorite,
      applyFavorite,
    }),
    [
      ready,
      modality,
      setModalityId,
      theme,
      toggleTheme,
      history,
      dataSource,
      loadingResults,
      refreshResults,
      loadMoreResults,
      selected,
      toggleNumber,
      clearSelection,
      applyNumbers,
      favorites,
      addFavorite,
      removeFavorite,
      applyFavorite,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
