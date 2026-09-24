import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as storage from '@/services/storage';
import { PoolBet, PoolParticipant } from '@/services/storage';
import { useAppState } from '@/state/AppStateContext';

export const POOL_TEMPLATES = {
  casal: { name: 'Bolão Casal', bets: 2 },
  familia: { name: 'Bolão Família', bets: 5 },
  trabalho: { name: 'Bolão do Trabalho', bets: 10 },
  turma: { name: 'Bolão da Turma', bets: 15 },
  premium: { name: 'Bolão Premium', bets: 20 },
  grande: { name: 'Bolão Grande', bets: 30 },
} as const;

export type PoolTemplateKey = keyof typeof POOL_TEMPLATES;

interface PoolContextValue {
  ready: boolean;
  name: string;
  setName: (v: string) => void;
  organizer: string;
  setOrganizer: (v: string) => void;
  contestNumber: string;
  setContestNumber: (v: string) => void;
  betPrice: number;
  setBetPrice: (v: number) => void;
  bets: PoolBet[];
  participants: PoolParticipant[];
  addBet: (numbers: number[]) => void;
  removeBet: (id: string) => void;
  addRandomBets: (count: number) => void;
  applyTemplate: (key: PoolTemplateKey) => void;
  clearBets: () => void;
  addParticipant: (name: string, shares: number) => void;
  removeParticipant: (id: string) => void;
}

const PoolContext = createContext<PoolContextValue | null>(null);

function randomPick(min: number, max: number, pick: number): number[] {
  const working: number[] = [];
  for (let i = min; i <= max; i += 1) working.push(i);
  const result: number[] = [];
  while (result.length < pick && working.length) {
    const idx = Math.floor(Math.random() * working.length);
    result.push(working.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PoolProvider({ children }: { children: ReactNode }) {
  const { modality } = useAppState();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [contestNumber, setContestNumber] = useState('');
  const [betPrice, setBetPrice] = useState(5);
  const [bets, setBets] = useState<PoolBet[]>([]);
  const [participants, setParticipants] = useState<PoolParticipant[]>([]);
  const loadedModalityId = useRef(modality.id);

  useEffect(() => {
    (async () => {
      const saved = await storage.loadPool(modality.id);
      setName(saved.name);
      setOrganizer(saved.organizer);
      setContestNumber(saved.contestNumber);
      setBetPrice(saved.betPrice);
      setParticipants(saved.participants);
      setBets(saved.bets);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bolão guarda apostas de uma modalidade por vez (mesmo comportamento do site):
  // ao trocar de modalidade, as apostas atuais são descartadas.
  useEffect(() => {
    if (!ready) return;
    if (loadedModalityId.current === modality.id) return;
    loadedModalityId.current = modality.id;
    setBets([]);
  }, [modality.id, ready]);

  const persist = useCallback(
    (overrides: Partial<Omit<storage.PoolState, 'modalityId'>> = {}) => {
      storage.savePool({
        modalityId: modality.id,
        name,
        organizer,
        contestNumber,
        betPrice,
        bets,
        participants,
        ...overrides,
      });
    },
    [modality.id, name, organizer, contestNumber, betPrice, bets, participants]
  );

  useEffect(() => {
    if (!ready) return;
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, name, organizer, contestNumber, betPrice, bets, participants]);

  const addBet = useCallback((numbers: number[]) => {
    if (!numbers.length) return;
    setBets((prev) => [...prev, { id: makeId(), numbers: [...numbers].sort((a, b) => a - b) }]);
  }, []);

  const removeBet = useCallback((id: string) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addRandomBets = useCallback(
    (count: number) => {
      const n = Math.min(30, Math.max(1, count));
      const newBets = Array.from({ length: n }, () => ({
        id: makeId(),
        numbers: randomPick(modality.min, modality.max, modality.pick),
      }));
      setBets((prev) => [...prev, ...newBets]);
    },
    [modality.min, modality.max, modality.pick]
  );

  const applyTemplate = useCallback(
    (key: PoolTemplateKey) => {
      const tpl = POOL_TEMPLATES[key];
      const newBets = Array.from({ length: tpl.bets }, () => ({
        id: makeId(),
        numbers: randomPick(modality.min, modality.max, modality.pick),
      }));
      setBets(newBets);
      setName((prev) => prev || tpl.name);
    },
    [modality.min, modality.max, modality.pick]
  );

  const clearBets = useCallback(() => setBets([]), []);

  const addParticipant = useCallback((participantName: string, shares: number) => {
    setParticipants((prev) => [...prev, { id: makeId(), name: participantName, shares: Math.max(1, shares) }]);
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo<PoolContextValue>(
    () => ({
      ready,
      name,
      setName,
      organizer,
      setOrganizer,
      contestNumber,
      setContestNumber,
      betPrice,
      setBetPrice,
      bets,
      participants,
      addBet,
      removeBet,
      addRandomBets,
      applyTemplate,
      clearBets,
      addParticipant,
      removeParticipant,
    }),
    [
      ready,
      name,
      organizer,
      contestNumber,
      betPrice,
      bets,
      participants,
      addBet,
      removeBet,
      addRandomBets,
      applyTemplate,
      clearBets,
      addParticipant,
      removeParticipant,
    ]
  );

  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
}

export function usePool(): PoolContextValue {
  const ctx = useContext(PoolContext);
  if (!ctx) throw new Error('usePool must be used within PoolProvider');
  return ctx;
}
