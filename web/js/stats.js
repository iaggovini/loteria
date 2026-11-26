import { formatNumber } from './config.js';

// Pega grupos inteiros (mesmo valor) até juntar pelo menos MIN_ITEMS dezenas,
// com teto de MAX_ITEMS para a lista não crescer demais na Lotomania.
const MIN_ITEMS = 8;
const MAX_ITEMS = 24;

function takeGroups(items, key) {
  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    if (out.length >= MIN_ITEMS && key(items[i]) !== key(out[out.length - 1])) break;
    if (out.length >= MAX_ITEMS) break;
    out.push(items[i]);
  }
  return out;
}

function groupBy(items, key) {
  const groups = [];
  items.forEach((item) => {
    const k = key(item);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(item);
    else groups.push({ key: k, items: [item] });
  });
  return groups;
}

function groupsHtml(groups, modality, label) {
  return `<div class="stat-groups">${groups
    .map(
      (g) => `<div class="stat-group">
        <p class="stat-group-label">${label(g.key)}</p>
        <div class="mini-balls">${g.items.map((d) => `<span class="mini-ball">${formatNumber(d.num, modality)}</span>`).join('')}</div>
      </div>`
    )
    .join('')}</div>`;
}

export function computeStats(contests, modality) {
  const frequency = new Map();
  const lastSeen = new Map();

  for (let i = 0; i < modality.max - modality.min + 1; i += 1) {
    const n = modality.min + i;
    frequency.set(n, 0);
    lastSeen.set(n, null);
  }

  contests.forEach((contest, index) => {
    [...contest.balls, ...(contest.balls2 || [])].forEach((ball) => {
      frequency.set(ball, (frequency.get(ball) || 0) + 1);
      if (lastSeen.get(ball) === null) {
        lastSeen.set(ball, index);
      }
    });
  });

  const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1]);
  const hot = sorted.filter(([, count]) => count > 0).slice(0, 8);
  // As que não saíram nenhuma vez já aparecem em "Mais atrasadas".
  const cold = takeGroups(
    [...frequency.entries()]
      .filter(([, count]) => count > 0)
      .map(([num, count]) => ({ num, count }))
      .sort((a, b) => a.count - b.count || a.num - b.num),
    (d) => d.count
  );

  const delay = takeGroups(
    [...lastSeen.entries()]
      .map(([num, seen]) => ({
        num,
        draws: seen === null ? contests.length : seen
      }))
      .sort((a, b) => b.draws - a.draws || a.num - b.num),
    (d) => d.draws
  );

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
        <h3>Mais sorteadas</h3>
        <ul class="stat-list">${hot
          .map(
            ([n, c]) =>
              `<li><span>${formatNumber(n, modality)}</span><div class="bar-wrap"><div class="bar" data-width="${(c / maxFreq) * 100}"></div></div><em>${c}×</em></li>`
          )
          .join('')}</ul>
      </article>
      <article class="stat-block">
        <h3>Menos sorteadas</h3>
        ${groupsHtml(groupBy(cold, (d) => d.count), modality, (count) => `${count} ${count === 1 ? 'vez' : 'vezes'}`)}
      </article>
      <article class="stat-block">
        <h3>Mais atrasadas</h3>
        ${groupsHtml(groupBy(delay, (d) => d.draws), modality, (draws) => (draws === contests.length ? `Não saíram em ${contests.length} concursos` : draws === 0 ? 'No último concurso' : `Há ${draws} concurso${draws === 1 ? '' : 's'}`))}
      </article>
    </div>
  `;

  container.querySelectorAll('.bar[data-width]').forEach((bar) => {
    bar.style.width = `${bar.dataset.width}%`;
  });
}
