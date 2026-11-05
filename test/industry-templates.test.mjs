import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { canonicalIndustry } from '../scripts/check-failure-patterns.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const templates = JSON.parse(readFileSync(join(ROOT, 'config', 'industry-templates.json'), 'utf8'));
const domains = JSON.parse(readFileSync(join(ROOT, 'config', 'domains.default.json'), 'utf8'));
const LEVELS = Object.keys(templates.verification_levels);
const nonEmptyStrings = (v) => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.trim());

function* metrics() {
  for (const [key, ind] of Object.entries(templates.industries)) {
    for (const m of ind.metrics) yield { key, ind, m };
  }
}

test('기본 도메인 여덟 개가 모두 템플릿과 연결됩니다', () => {
  const keys = new Set(Object.keys(templates.industries));
  for (const domain of domains.domains) {
    assert.ok(keys.has(canonicalIndustry(domain, templates)), domain);
  }
  assert.equal(canonicalIndustry('석화', templates), 'petrochemical');
  assert.equal(canonicalIndustry('LCC항공', templates), 'aviation');
});

test('모든 지표에 정의, 단위, 비교 기준, 흔한 오독, 출처, 확인 수준이 있습니다', () => {
  for (const { key, m } of metrics()) {
    const where = `${key}/${m.id}`;
    assert.match(m.id, /^[a-z0-9_]+$/, where);
    assert.ok(m.name?.trim(), where);
    assert.ok(m.definition?.trim(), where);
    assert.equal(typeof m.required, 'boolean', where);
    assert.ok(nonEmptyStrings(m.units), where);
    assert.ok(nonEmptyStrings(m.comparison_basis), where);
    assert.ok(nonEmptyStrings(m.common_misreads), where);
    assert.ok(nonEmptyStrings(m.source_ids), where);
    assert.ok(LEVELS.includes(m.verification), where);
    for (const id of m.source_ids) assert.ok(templates.sources[id], `${where}: ${id}`);
  }
});

test('업종마다 지표 id가 겹치지 않고 거시 변수가 있습니다', () => {
  for (const [key, ind] of Object.entries(templates.industries)) {
    const ids = ind.metrics.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length, key);
    assert.ok(ind.macro_controls.length > 0, key);
    for (const c of ind.macro_controls) assert.ok(c.id && c.name && c.why, key);
  }
});

test('요청한 핵심 지표가 빠지지 않았습니다', () => {
  const ids = (key) => templates.industries[key].metrics.map((m) => m.id);
  for (const id of ['newbuild_price', 'order_backlog', 'cgt_vessels']) assert.ok(ids('shipbuilding').includes(id), id);
  for (const id of ['metal_price', 'utilization']) assert.ok(ids('battery').includes(id), id);
  for (const id of ['crack_spread', 'lagging_effect']) assert.ok(ids('refining').includes(id), id);
  for (const id of ['ethylene_spread', 'lagging_effect']) assert.ok(ids('petrochemical').includes(id), id);
});

test('출처는 http 주소이고, 본문을 보지 못한 출처만으로는 primary 나 secondary 를 주지 않습니다', () => {
  for (const [id, s] of Object.entries(templates.sources)) {
    assert.match(s.url, /^https?:\/\//, id);
    assert.ok(s.publisher && s.title && s.note, id);
    assert.equal(typeof s.opened, 'boolean', id);
  }
  for (const { key, m } of metrics()) {
    if (m.verification === 'partial') continue;
    assert.ok(m.source_ids.some((id) => templates.sources[id].opened), `${key}/${m.id}`);
  }
});

test('primary 지표에는 공식·법령·1차 자료를 실제로 연 출처가 있습니다', () => {
  for (const { key, m } of metrics()) {
    if (m.verification !== 'primary') continue;
    const opened = m.source_ids.map((id) => templates.sources[id]).filter((s) => s.opened);
    assert.ok(opened.some((s) => ['official', 'law', 'primary'].includes(s.kind)), `${key}/${m.id}`);
  }
});

test('템플릿에 수치 예시를 넣지 않습니다', () => {
  const numberWithUnit = /\d[\d,.]*\s*(달러|원|억|조|%|퍼센트|톤|CGT|GWh|kWh|척|배럴|\$)|\$\s*\d/;
  for (const { key, m } of metrics()) {
    for (const text of [m.definition, ...m.units, ...m.comparison_basis, ...m.common_misreads]) {
      assert.doesNotMatch(text, numberWithUnit, `${key}/${m.id}: ${text}`);
    }
  }
});
