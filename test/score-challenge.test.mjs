import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HUMAN_GATE_NOTICE, InputError, WEIGHTS, formatResult, loadTemplates, scoreChallenge } from '../scripts/score-challenge.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'score-challenge.mjs');
const templates = loadTemplates();

const url = 'https://example.test/source';
const counter = (over = {}) => ({
  claim: '시험 반론',
  directness: 'direct',
  source: { tier: 'T1+', url, published_at: '2026-08-01', body_read: true, ...(over.source ?? {}) },
  ...(over.top ?? {}),
});
const shipbuildingMacros = [
  { id: 'usd_krw', status: 'controlled', source_url: url },
  { id: 'ship_mix', status: 'controlled', source_url: url },
  { id: 'delivery_timing', status: 'not_applicable', reason: '시험용 사유' },
];
const full = (over = {}) => ({
  verdict: 'SURVIVES',
  industry: '조선',
  yama_latest_evidence_at: '2026-08-10',
  why_survives: { text: '시험 이유', url },
  counters: [counter()],
  numbers: [{ label: '시험 수치', tag: '실적', reproduced: 'match', source_url: url }],
  macro_controls: shipbuildingMacros,
  comparisons: [{ label: '시험 비교', period: 'same', unit: 'same', scope: 'same' }],
  ...over,
});
const codes = (list) => list.map((f) => f.code);

test('가중치 합은 100입니다', () => {
  assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 100);
});

test('모든 축을 근거로 채우면 100점입니다', () => {
  const r = scoreChallenge(full(), templates);
  assert.equal(r.evidence_score, 100);
  assert.equal(r.band, '근거 충실');
  assert.deepEqual(r.flags, []);
  assert.deepEqual(r.verdict_conflicts, []);
});

test('같은 입력은 항상 같은 결과이고 입력을 바꾸지 않습니다', () => {
  const input = full();
  const before = JSON.stringify(input);
  const first = JSON.stringify(scoreChallenge(input, templates));
  assert.equal(JSON.stringify(scoreChallenge(input, templates)), first);
  assert.equal(JSON.stringify(input), before);
});

test('반론 출처 티어가 낮으면 점수가 내려갑니다', () => {
  const points = (tier) => scoreChallenge(full({ counters: [counter({ source: { tier } })] }), templates).axes.counter_source.points;
  assert.equal(points('T1+'), 30);
  assert.equal(points('T1'), 27);
  assert.equal(points('T2'), 18);
  assert.equal(points('T3'), 9);
});

test('간접 반론은 낮게 잡고 가장 강한 반론을 씁니다', () => {
  const indirect = scoreChallenge(full({ counters: [counter({ top: { directness: 'indirect' } })] }), templates);
  assert.equal(indirect.axes.counter_source.points, 21);
  const mixed = scoreChallenge(full({ counters: [counter({ source: { tier: 'T3' } }), counter()] }), templates);
  assert.equal(mixed.axes.counter_source.points, 30);
});

test('본문을 열지 않은 반론은 점수에 넣지 않습니다', () => {
  const r = scoreChallenge(full({ counters: [counter({ source: { body_read: false } })] }), templates);
  assert.ok(codes(r.flags).includes('COUNTER_NOT_COUNTED'));
  assert.ok(codes(r.flags).includes('NO_COUNTER_SEARCH'));
  assert.equal(r.axes.counter_source.points, 0);
});

test('반론이 없으면 검색 기록의 유무로 구분하고 만점을 주지 않습니다', () => {
  const logged = scoreChallenge(full({ counters: [], search_log: ['반대 검색 하나', '반대 검색 둘'] }), templates);
  assert.equal(logged.axes.counter_source.points, 12);
  assert.ok(codes(logged.flags).includes('NO_COUNTER_FOUND'));
  const none = scoreChallenge(full({ counters: [] }), templates);
  assert.equal(none.axes.counter_source.points, 0);
});

test('수치 재현: 불일치와 미확인을 표시합니다', () => {
  const r = scoreChallenge(
    full({
      numbers: [
        { label: '맞음', tag: '실적', reproduced: 'match', source_url: url },
        { label: '틀림', tag: '실적', reproduced: 'mismatch', source_url: url },
        { label: '태그 없음', reproduced: 'match', source_url: url },
        { label: '출처 없음', tag: '계획', reproduced: 'match' },
      ],
    }),
    templates,
  );
  assert.equal(r.axes.number_reproduction.points, 7.5);
  assert.deepEqual(codes(r.flags).filter((c) => c.startsWith('NUMBER')), ['NUMBER_MISMATCH', 'NUMBER_UNCHECKED', 'NUMBER_UNCHECKED']);
});

test('수치와 직접 비교가 없으면 그 축을 빼고 다시 계산합니다', () => {
  const r = scoreChallenge(full({ numbers: [], comparisons: [] }), templates);
  assert.equal(r.axes.number_reproduction.applicable, false);
  assert.equal(r.axes.comparison_basis.applicable, false);
  assert.equal(r.evidence_score, 100);
});

test('거시 변수: 업종 템플릿의 변수를 빠뜨리면 감점합니다', () => {
  const r = scoreChallenge(full({ macro_controls: [{ id: 'usd_krw', status: 'controlled', source_url: url }] }), templates);
  assert.equal(r.axes.macro_control.max, 25);
  assert.ok(Math.abs(r.axes.macro_control.points - 8.3) < 0.01);
  assert.equal(codes(r.flags).filter((c) => c === 'MACRO_UNCONTROLLED').length, 2);
  const noSource = scoreChallenge(full({ macro_controls: [{ id: 'usd_krw', status: 'controlled' }] }), templates);
  assert.equal(noSource.axes.macro_control.points, 0);
});

test('템플릿에 없는 업종은 알리고 입력한 변수만 봅니다', () => {
  const r = scoreChallenge(full({ industry: '우주', macro_controls: [{ id: 'x', name: '시험 변수', status: 'controlled', source_url: url }] }), templates);
  assert.ok(codes(r.flags).includes('INDUSTRY_NOT_IN_TEMPLATE'));
  assert.equal(r.axes.macro_control.points, 25);
  const empty = scoreChallenge(full({ industry: '우주', macro_controls: [] }), templates);
  assert.equal(empty.axes.macro_control.applicable, false);
});

test('비교 기준이 어긋나면 감점합니다', () => {
  const r = scoreChallenge(
    full({
      comparisons: [
        { label: '같음', period: 'same', unit: 'same', scope: 'same' },
        { label: '기간 다름', period: 'different', unit: 'same', scope: 'same' },
      ],
    }),
    templates,
  );
  assert.equal(r.axes.comparison_basis.points, 7.5);
  assert.ok(codes(r.flags).includes('BASIS_MISMATCH'));
});

test('판정 규칙과 어긋나면 판정을 바꾸지 않고 알립니다', () => {
  const newer = scoreChallenge(full({ counters: [counter({ source: { published_at: '2026-08-20' } })] }), templates);
  assert.equal(newer.verdict, 'SURVIVES');
  assert.ok(codes(newer.verdict_conflicts).includes('VERDICT_RULE_CONFLICT'));
  const collapses = scoreChallenge(full({ verdict: 'COLLAPSES', counters: [counter({ source: { published_at: '2026-08-20' } })] }), templates);
  assert.deepEqual(collapses.verdict_conflicts, []);
  assert.ok(codes(scoreChallenge(full({ verdict: 'WEAKENED' }), templates).verdict_conflicts).includes('WEAKENED_NO_SCOPE'));
  assert.ok(codes(scoreChallenge(full({ why_survives: { text: '이유만' } }), templates).verdict_conflicts).includes('SURVIVES_NO_REASON'));
  assert.ok(codes(scoreChallenge(full({ verdict: 'COLLAPSES', counters: [] }), templates).verdict_conflicts).includes('COLLAPSES_NO_SOURCE'));
});

test('COLLAPSES 도 근거가 탄탄하면 점수가 높습니다. 점수는 야마 평가가 아닙니다', () => {
  const r = scoreChallenge(full({ verdict: 'COLLAPSES', counters: [counter({ source: { published_at: '2026-08-20' } })] }), templates);
  assert.equal(r.evidence_score, 100);
  assert.equal(r.verdict, 'COLLAPSES');
});

test('결과는 통과·탈락을 내지 않고 사람의 결정을 요구합니다', () => {
  const r = scoreChallenge(full(), templates);
  assert.equal(r.needs_human_decision, true);
  assert.equal(r.notice, HUMAN_GATE_NOTICE);
  assert.match(r.notice, /사람이 합니다/);
  for (const key of ['pass', 'approved', 'publish', 'go']) assert.equal(key in r, false);
  assert.match(formatResult(r), /판정: SURVIVES · 근거 점수 100\/100/);
});

test('잘못된 입력은 거부합니다', () => {
  assert.throws(() => scoreChallenge(null, templates), InputError);
  assert.throws(() => scoreChallenge({ verdict: 'MAYBE' }, templates), InputError);
});

test('템플릿 없이도 동작합니다', () => {
  const r = scoreChallenge(full({ macro_controls: [] }), null);
  assert.ok(codes(r.flags).includes('INDUSTRY_NOT_IN_TEMPLATE'));
  assert.equal(r.axes.macro_control.applicable, false);
});

test('명령줄 실행 결과와 오류 코드', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hb-score-'));
  try {
    const path = join(dir, 'in.json');
    writeFileSync(path, JSON.stringify(full()));
    const ok = spawnSync(process.execPath, [SCRIPT, '--input', path, '--json'], { encoding: 'utf8' });
    assert.equal(ok.status, 0);
    assert.equal(JSON.parse(ok.stdout).evidence_score, 100);
    writeFileSync(path, '{"verdict":"X"}');
    const bad = spawnSync(process.execPath, [SCRIPT, '--input', path], { encoding: 'utf8' });
    assert.equal(bad.status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hb-agent 의 SCORE_INPUT 예시 키가 점수 도구와 맞습니다', () => {
  const agent = readFileSync(join(ROOT, '.claude', 'agents', 'hb-agent.md'), 'utf8');
  const line = agent.split(/\r?\n/).find((l) => l.startsWith('{"verdict"'));
  const example = JSON.parse(line);
  for (const key of ['verdict', 'industry', 'yama_latest_evidence_at', 'why_survives', 'narrowed_scope', 'counters', 'search_log', 'numbers', 'macro_controls', 'comparisons']) {
    assert.ok(key in example, key);
  }
  assert.doesNotThrow(() => scoreChallenge(example, templates));
});
