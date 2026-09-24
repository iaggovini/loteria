import { formatNumber } from './config.js';

export function computeStats(contests, modality) {
  const frequency = new Map();
  const lastSeen = new Map();

  for (let i = 0; i < modality.max - modality.min + 1; i += 1) {
    const n = modality.min + i;
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

  const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1]);
  const hot = sorted.filter(([, count]) => count > 0).slice(0, 8);
  const cold = [...frequency.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 8);

  const delay = [...lastSeen.entries()]
    .map(([num, seen]) => ({
      num,
      draws: seen === null ? contests.length : seen
    }))
    .sort((a, b) => b.draws - a.draws)
    .slice(0, 10);

  return { hot, cold, delay, maxFreq: Math.max(...frequency.values(), 1) };
}

export function renderStats(container, contests, modality) {
  if (!contests.length) {
    container.innerHTML = '<p class="state-message">Sem dados para estatísticas.</p>';
    return;
  }

  const { hot, cold, delay, maxFreq } = computeStats(contests, modality);

  container.innerHTML = `
    <div class="stats-grid">
      <article class="stat-block">
        <h3>Mais sorteadas (${contests.length} concursos)</h3>
        <ul class="stat-list">${hot
          .map(
            ([n, c]) =>
              `<li><span>${formatNumber(n, modality)}</span><div class="bar-wrap"><div class="bar" style="width:${(c / maxFreq) * 100}%"></div></div><em>${c}×</em></li>`
          )
          .join('')}</ul>
      </article>
      <article class="stat-block">
        <h3>Menos sorteadas</h3>
        <ul class="stat-list">${cold
          .map(
            ([n, c]) =>
              `<li><span>${formatNumber(n, modality)}</span><div class="bar-wrap"><div class="bar bar-muted" style="width:${maxFreq ? (c / maxFreq) * 100 : 0}%"></div></div><em>${c}×</em></li>`
          )
          .join('')}</ul>
      </article>
      <article class="stat-block">
        <h3>Maior atraso</h3>
        <ul class="stat-list stat-delay">${delay
          .map(
            (d) =>
              `<li><span>${formatNumber(d.num, modality)}</span><em>${d.draws === contests.length ? 'não saiu no período' : `${d.draws} sorteio(s) atrás`}</em></li>`
          )
          .join('')}</ul>
      </article>
    </div>
  `;
}
