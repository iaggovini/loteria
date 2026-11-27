// Testes das regras do site. Rodar com: node --test "tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODALITIES, findPrizeTier, getPrizeLabel, getExtraPrizeLabel, formatNumber } from '../web/js/config.js';
import { normalizeContest } from '../web/js/api.js';
import { formatPrize } from '../web/js/draws.js';

const mega = MODALITIES.megasena;
const mais = MODALITIES.maismilionaria;
const lotomania = MODALITIES.lotomania;

test('Mega-Sena: só 4, 5 e 6 acertos são premiados', () => {
  assert.equal(findPrizeTier(mega, 6).label, 'Sena (6 acertos)');
  assert.equal(findPrizeTier(mega, 4).label, 'Quadra (4 acertos)');
  assert.equal(findPrizeTier(mega, 3), null);
  assert.equal(getPrizeLabel(mega, 1), '1 acerto (sem prêmio)');
});

test('Lotomania: 0 acertos também é premiado', () => {
  assert.ok(findPrizeTier(lotomania, 0));
  assert.ok(findPrizeTier(lotomania, 20));
  assert.equal(findPrizeTier(lotomania, 10), null);
});

test('+Milionária: faixas combinam acertos e trevos', () => {
  assert.equal(findPrizeTier(mais, 6, 2).label, '6 acertos + 2 trevos');
  assert.equal(findPrizeTier(mais, 6, 1).label, '6 acertos + 1 ou nenhum trevo');
  assert.equal(findPrizeTier(mais, 6, 0).label, '6 acertos + 1 ou nenhum trevo');
  assert.equal(findPrizeTier(mais, 3, 1).label, '3 acertos + 1 trevo');
  assert.equal(findPrizeTier(mais, 3, 0), null);
  assert.equal(findPrizeTier(mais, 2, 2).label, '2 acertos + 2 trevos');
  assert.equal(findPrizeTier(mais, 2, 0), null);
  assert.equal(findPrizeTier(mais, 1, 2), null);
  assert.equal(getExtraPrizeLabel(mais, 1, 1), '1 acerto + 1 trevo (sem prêmio)');
});

test('formatNumber completa com zero à esquerda', () => {
  assert.equal(formatNumber(5), '05');
  assert.equal(formatNumber(60), '60');
});

test('formatPrize abrevia milhões e bilhões', () => {
  assert.equal(formatPrize(null), null);
  assert.equal(formatPrize(0), null);
  assert.match(formatPrize(75000000), /^R\$ 75 milhões$/);
  assert.match(formatPrize(1000000), /^R\$ 1 milhão$/);
  assert.match(formatPrize(1500000000), /^R\$ 1,5 bilhão$/);
});

test('normalizeContest lê a resposta da Caixa', () => {
  const c = normalizeContest({
    numero: 100,
    dataApuracao: '01/01/2026',
    listaDezenas: ['30', '05', '12'],
    listaDezenasSegundoSorteio: ['02', '01'],
    trevosSorteados: ['6', '2'],
    acumulado: true,
    numeroConcursoProximo: 101,
    dataProximoConcurso: '03/01/2026',
    valorEstimadoProximoConcurso: 5000000,
    listaRateioPremio: [{ descricaoFaixa: ' 6 acertos ', numeroDeGanhadores: 0, valorPremio: 0 }, { descricaoFaixa: '' }]
  }, 'maismilionaria');
  assert.deepEqual(c.balls, [5, 12, 30]);
  assert.deepEqual(c.balls2, [1, 2]);
  assert.deepEqual(c.trevos, [2, 6]);
  assert.equal(c.accumulated, true);
  assert.equal(c.nextPrize, 5000000);
  assert.deepEqual(c.prizes, [{ label: '6 acertos', winners: 0, value: 0 }]);
  assert.equal(c.modalityId, 'maismilionaria');
});

test('normalizeContest aceita resposta sem trevos nem 2º sorteio', () => {
  const c = normalizeContest({ numero: 1, dezenasSorteadasOrdemSorteio: ['10', '01'] }, 'megasena');
  assert.deepEqual(c.balls, [1, 10]);
  assert.equal(c.balls2, null);
  assert.equal(c.trevos, null);
  assert.equal(c.nextPrize, null);
});

test('dados de reserva (web/data) estão válidos para todas as modalidades', () => {
  for (const mod of Object.values(MODALITIES)) {
    const list = JSON.parse(readFileSync(new URL(`../web/data/history-${mod.id}.json`, import.meta.url), 'utf8'));
    assert.ok(Array.isArray(list) && list.length > 0, `${mod.id}: lista vazia`);
    for (const c of list) {
      assert.ok(Number.isInteger(c.contest), `${mod.id}: concurso inválido`);
      assert.ok(c.balls.every((n) => n >= mod.min && n <= mod.max), `${mod.id} ${c.contest}: dezena fora da faixa`);
    }
    for (let i = 1; i < list.length; i += 1) {
      assert.ok(list[i - 1].contest > list[i].contest, `${mod.id}: concursos fora de ordem`);
    }
  }
});
