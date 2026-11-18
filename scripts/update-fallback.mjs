// Atualiza os dados de reserva (web/data/history-*.json) com os concursos
// reais mais recentes da API da Caixa. O site usa esses arquivos quando a API
// não responde no navegador do usuário.
//
// Uso: node scripts/update-fallback.mjs

import { writeFile } from 'node:fs/promises';
import { API_BASE, MODALITIES } from '../web/js/config.js';
import { normalizeContest } from '../web/js/api.js';

const COUNT = 30;
const OUT_DIR = new URL('../web/data/', import.meta.url);
const HEADERS = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (BomDeSorte fallback updater)' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}/${path}`, { headers: HEADERS });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (attempt >= 4) throw new Error(`${path}: ${err.message}`);
      await sleep(1500 * attempt);
    }
  }
}

async function updateModality(mod) {
  const latest = normalizeContest(await getJson(mod.apiPath), mod.id);
  const contests = [latest];
  for (let n = latest.contest - 1; n > latest.contest - COUNT && n >= 1; n -= 1) {
    contests.push(normalizeContest(await getJson(`${mod.apiPath}/${n}`), mod.id));
    await sleep(250);
  }
  // Um concurso por linha: diffs legíveis no git.
  const body = `[\n${contests.map((c) => `  ${JSON.stringify(c)}`).join(',\n')}\n]\n`;
  await writeFile(new URL(`history-${mod.id}.json`, OUT_DIR), body, 'utf8');
  console.log(`${mod.name}: concursos ${contests.at(-1).contest}–${latest.contest}`);
}

let failed = 0;
for (const mod of Object.values(MODALITIES)) {
  try {
    await updateModality(mod);
  } catch (err) {
    failed += 1;
    console.error(`${mod.name}: falhou (${err.message}); arquivo anterior mantido`);
  }
}
process.exit(failed === Object.keys(MODALITIES).length ? 1 : 0);
