#!/usr/bin/env node
// 반론 검증(CHALLENGE) 결과 옆에 붙일 근거 점수를 규칙으로 계산한다.
// 같은 입력이면 항상 같은 결과가 나온다. 시각과 난수를 쓰지 않는다.
// 이 점수는 '반론 검증이 근거를 얼마나 갖췄는가'를 잰다. 야마가 옳은지를 재지 않는다.
// 발제 선정과 기사화 결정은 GATE 1·2·3에서 사람이 한다.
//
//   node scripts/score-challenge.mjs --input challenge.json
//   node scripts/score-challenge.mjs --input challenge.json --json

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES = join(HERE, '..', 'config', 'industry-templates.json');

export const WEIGHTS = { counter_source: 30, number_reproduction: 30, macro_control: 25, comparison_basis: 15 };
export const TIER_FACTOR = { 'T1+': 1, T1: 0.9, T2: 0.6, T3: 0.3 };
export const INDIRECT_FACTOR = 0.7;
export const NO_COUNTER_FACTOR = 0.4;
export const MIN_SEARCH_QUERIES = 2;
export const NUMBER_TAGS = ['실적', '전망', '계획', '중간집계', '목표'];
export const VERDICTS = ['SURVIVES', 'WEAKENED', 'COLLAPSES'];
export const BANDS = [
  { min: 80, name: '근거 충실' },
  { min: 50, name: '보강 필요' },
  { min: 0, name: '근거 부족' },
];
export const HUMAN_GATE_NOTICE =
  '이 점수는 반론 검증의 근거 수준을 규칙으로 잰 값입니다. 야마의 옳고 그름이나 기사 가치를 판정하지 않으며, 체크 6과 GATE 3의 결정은 사람이 합니다.';

export class InputError extends Error {}

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\/\S+$/i.test(value);

function toTime(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

export function resolveIndustry(name, templates) {
  if (!name || !templates?.industries) return null;
  const wanted = String(name).trim().toLowerCase();
  for (const [key, ind] of Object.entries(templates.industries)) {
    const names = [key, ind.label, ...(ind.aliases ?? [])].map((n) => String(n).toLowerCase());
    if (names.includes(wanted)) return { key, ...ind };
  }
  return null;
}

function validCounter(counter) {
  const source = counter?.source ?? {};
  const problems = [];
  if (!(source.tier in TIER_FACTOR)) problems.push('티어 표기 없음');
  if (!isHttpUrl(source.url)) problems.push('주소 없음');
  if (toTime(source.published_at) === null) problems.push('발행일 없음');
  if (source.body_read !== true) problems.push('본문 미열람');
  return problems;
}

function scoreCounterSource(input, flags) {
  const max = WEIGHTS.counter_source;
  const counters = Array.isArray(input.counters) ? input.counters : [];
  const valid = [];
  for (const counter of counters) {
    const problems = validCounter(counter);
    if (problems.length) {
      flags.push({ code: 'COUNTER_NOT_COUNTED', detail: `반론 '${counter?.claim ?? '이름 없음'}'을 점수에 넣지 않았습니다: ${problems.join(', ')}` });
    } else {
      valid.push(counter);
    }
  }
  if (valid.length) {
    const factors = valid.map((c) => TIER_FACTOR[c.source.tier] * (c.directness === 'direct' ? 1 : INDIRECT_FACTOR));
    const best = Math.max(...factors);
    return { points: max * best, max, applicable: true, detail: `확인된 반론 ${valid.length}건, 가장 높은 계수 ${best.toFixed(2)}`, valid };
  }
  const queries = Array.isArray(input.search_log) ? input.search_log.filter((q) => typeof q === 'string' && q.trim()) : [];
  if (queries.length >= MIN_SEARCH_QUERIES) {
    flags.push({ code: 'NO_COUNTER_FOUND', detail: `확인된 반론 없이 검색 ${queries.length}건만 기록됐습니다. 반론이 없다는 증거는 아닙니다.` });
    return { points: max * NO_COUNTER_FACTOR, max, applicable: true, detail: `검색 ${queries.length}건 기록, 확인된 반론 없음`, valid };
  }
  flags.push({ code: 'NO_COUNTER_SEARCH', detail: '확인된 반론도, 반대 방향 검색 기록도 부족합니다.' });
  return { points: 0, max, applicable: true, detail: '반론과 검색 기록 부족', valid };
}

function scoreNumbers(input, flags) {
  const max = WEIGHTS.number_reproduction;
  const numbers = Array.isArray(input.numbers) ? input.numbers : [];
  if (numbers.length === 0) {
    return { points: 0, max, applicable: false, detail: '입력에 수치가 없어 이 항목을 뺐습니다.' };
  }
  let matched = 0;
  for (const n of numbers) {
    const label = n?.label ?? '이름 없음';
    if (n?.reproduced === 'mismatch') {
      flags.push({ code: 'NUMBER_MISMATCH', detail: `수치 '${label}'가 원문과 다릅니다. 고치기 전에 쓰면 안 됩니다.` });
    } else if (n?.reproduced === 'match' && NUMBER_TAGS.includes(n?.tag) && isHttpUrl(n?.source_url)) {
      matched += 1;
    } else {
      flags.push({ code: 'NUMBER_UNCHECKED', detail: `수치 '${label}'는 재현 확인, 성격 태그, 출처 주소 중 빠진 것이 있습니다.` });
    }
  }
  return { points: (max * matched) / numbers.length, max, applicable: true, detail: `수치 ${numbers.length}건 중 ${matched}건 재현 확인` };
}

function scoreMacro(input, industry, flags) {
  const max = WEIGHTS.macro_control;
  const entries = Array.isArray(input.macro_controls) ? input.macro_controls : [];
  const byId = new Map(entries.filter((e) => e?.id).map((e) => [String(e.id), e]));
  const required = (industry?.macro_controls ?? []).map((m) => ({ id: m.id, name: m.name }));
  for (const e of entries) {
    if (e?.id && !required.some((r) => r.id === String(e.id))) required.push({ id: String(e.id), name: e.name ?? String(e.id) });
  }
  if (required.length === 0) {
    flags.push({ code: 'INDUSTRY_UNKNOWN', detail: '업종 템플릿과 입력 모두에 거시 변수가 없어 이 항목을 뺐습니다.' });
    return { points: 0, max, applicable: false, detail: '확인할 거시 변수 없음' };
  }
  let controlled = 0;
  for (const item of required) {
    const entry = byId.get(item.id);
    const ok =
      (entry?.status === 'controlled' && isHttpUrl(entry?.source_url)) ||
      (entry?.status === 'not_applicable' && typeof entry?.reason === 'string' && entry.reason.trim());
    if (ok) controlled += 1;
    else flags.push({ code: 'MACRO_UNCONTROLLED', detail: `거시 변수 '${item.name}'를 통제했다는 근거가 없습니다.` });
  }
  return { points: (max * controlled) / required.length, max, applicable: true, detail: `거시 변수 ${required.length}개 중 ${controlled}개 통제 확인` };
}

function scoreComparisons(input, flags) {
  const max = WEIGHTS.comparison_basis;
  const comparisons = Array.isArray(input.comparisons) ? input.comparisons : [];
  if (comparisons.length === 0) {
    return { points: 0, max, applicable: false, detail: '직접 비교가 없어 이 항목을 뺐습니다.' };
  }
  let same = 0;
  for (const c of comparisons) {
    if (c?.period === 'same' && c?.unit === 'same' && c?.scope === 'same') same += 1;
    else flags.push({ code: 'BASIS_MISMATCH', detail: `비교 '${c?.label ?? '이름 없음'}'의 기간·단위·범위가 맞지 않거나 확인되지 않았습니다.` });
  }
  return { points: (max * same) / comparisons.length, max, applicable: true, detail: `직접 비교 ${comparisons.length}건 중 ${same}건 기준 일치` };
}

function checkVerdict(input, validCounters) {
  const conflicts = [];
  const verdict = input.verdict;
  const yamaTime = toTime(input.yama_latest_evidence_at);
  const stronger = validCounters.filter((c) => c.directness === 'direct' && yamaTime !== null && toTime(c.source.published_at) > yamaTime);
  if (stronger.length && verdict !== 'COLLAPSES') {
    conflicts.push({ code: 'VERDICT_RULE_CONFLICT', detail: `야마의 근거보다 최신이고 직접적인 반론이 ${stronger.length}건 있습니다. hb-agent 규칙상 COLLAPSES 후보이니 사람이 확인해 주세요.` });
  }
  if (verdict === 'WEAKENED' && !String(input.narrowed_scope ?? '').trim()) {
    conflicts.push({ code: 'WEAKENED_NO_SCOPE', detail: 'WEAKENED 판정에는 좁힐 범위를 적어야 합니다.' });
  }
  if (verdict === 'SURVIVES' && !(String(input.why_survives?.text ?? '').trim() && isHttpUrl(input.why_survives?.url))) {
    conflicts.push({ code: 'SURVIVES_NO_REASON', detail: 'SURVIVES 판정에는 남는 이유와 출처 주소를 적어야 합니다.' });
  }
  if (verdict === 'COLLAPSES' && validCounters.length === 0) {
    conflicts.push({ code: 'COLLAPSES_NO_SOURCE', detail: 'COLLAPSES 판정인데 확인된 반론 출처가 없습니다.' });
  }
  return conflicts;
}

export function scoreChallenge(input, templates) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('입력은 JSON 객체여야 합니다.');
  if (!VERDICTS.includes(input.verdict)) throw new InputError(`verdict 는 ${VERDICTS.join(', ')} 중 하나여야 합니다.`);
  const flags = [];
  const industry = resolveIndustry(input.industry, templates);
  if (input.industry && !industry) {
    flags.push({ code: 'INDUSTRY_NOT_IN_TEMPLATE', detail: `업종 '${input.industry}'의 템플릿이 없어 업종별 거시 변수를 대조하지 못했습니다.` });
  }
  const counter = scoreCounterSource(input, flags);
  const axes = {
    counter_source: counter,
    number_reproduction: scoreNumbers(input, flags),
    macro_control: scoreMacro(input, industry, flags),
    comparison_basis: scoreComparisons(input, flags),
  };
  const applicable = Object.values(axes).filter((a) => a.applicable);
  const earned = applicable.reduce((sum, a) => sum + a.points, 0);
  const possible = applicable.reduce((sum, a) => sum + a.max, 0);
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  const band = BANDS.find((b) => score >= b.min).name;
  const axisView = Object.fromEntries(
    Object.entries(axes).map(([name, a]) => [
      name,
      { applicable: a.applicable, points: Math.round(a.points * 10) / 10, max: a.max, detail: a.detail },
    ]),
  );
  return {
    verdict: input.verdict,
    evidence_score: score,
    band,
    axes: axisView,
    flags,
    verdict_conflicts: checkVerdict(input, counter.valid),
    needs_human_decision: true,
    notice: HUMAN_GATE_NOTICE,
  };
}

export function formatResult(result) {
  const names = { counter_source: '반론 출처', number_reproduction: '수치 재현', macro_control: '거시 변수 통제', comparison_basis: '비교 기준' };
  const lines = [`판정: ${result.verdict} · 근거 점수 ${result.evidence_score}/100 (${result.band})`];
  for (const [key, axis] of Object.entries(result.axes)) {
    lines.push(`- ${names[key]}: ${axis.applicable ? `${axis.points}/${axis.max}` : '해당 없음'} — ${axis.detail}`);
  }
  if (result.verdict_conflicts.length) {
    lines.push('판정 규칙과 어긋나는 점');
    for (const c of result.verdict_conflicts) lines.push(`- ${c.code}: ${c.detail}`);
  }
  if (result.flags.length) {
    lines.push('확인이 필요한 점');
    for (const f of result.flags) lines.push(`- ${f.code}: ${f.detail}`);
  }
  lines.push(result.notice);
  return lines.join('\n');
}

export function loadTemplates(path = DEFAULT_TEMPLATES) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const args = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input') args.input = argv[(i += 1)];
    else if (argv[i] === '--templates') args.templates = argv[(i += 1)];
    else if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
    else throw new InputError(`알 수 없는 인자입니다: ${argv[i]}`);
  }
  if (args.help || !args.input) {
    console.log('사용법: node scripts/score-challenge.mjs --input 반론결과.json [--templates 템플릿경로] [--json]\n입력 형식은 docs/반론_점수와_실패_대조.md 를 봐 주세요.');
    if (!args.help) process.exitCode = 2;
    return;
  }
  let input;
  try {
    input = JSON.parse(readFileSync(resolve(args.input), 'utf8'));
  } catch (err) {
    throw new InputError(`입력 파일을 읽지 못했습니다: ${err.message}`);
  }
  const templates = loadTemplates(args.templates ? resolve(args.templates) : DEFAULT_TEMPLATES);
  const result = scoreChallenge(input, templates);
  console.log(args.json ? JSON.stringify(result, null, 2) : formatResult(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 2;
  }
}
