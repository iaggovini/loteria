import { Modality } from '@/constants/modalities';
import { Contest } from '@/services/api';

export interface DelayEntry {
  num: number;
  draws: number;
}

export interface StatsResult {
  hot: [number, number][];
  cold: [number, number][];
  delay: DelayEntry[];
  maxFreq: number;
}

export function computeStats(contests: Contest[], modality: Modality): StatsResult {
  const frequency = new Map<number, number>();
  const lastSeen = new Map<number, number | null>();

  for (let n = modality.min; n <= modality.max; n += 1) {
    frequency.set(n, 0);
    lastSeen.set(n, null);
  }

  contests.forEach((contest, index) => {
    contest.balls.forEach((ball) => {
      frequency.set(ball, (frequency.get(ball) || 0) + 1);
      if (lastSeen.get(ball) === null) {
        lastSeen.set(ball, index);
      }
    });
  });

  const hot = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
    .slice(0, 8);

  const cold = [...frequency.entries()].sort((a, b) => a[1] - b[1]).slice(0, 8);

  const delay = [...lastSeen.entries()]
    .map(([num, seen]) => ({ num, draws: seen === null ? contests.length : seen }))
    .sort((a, b) => b.draws - a.draws)
    .slice(0, 10);

  return { hot, cold, delay, maxFreq: Math.max(...frequency.values(), 1) };
}
