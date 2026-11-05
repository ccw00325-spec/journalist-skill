#!/usr/bin/env node
// 사람이 적은 실패 로그와 새 발제 후보를 규칙으로 대조해 경고를 낸다.
// 학습이나 추론을 하지 않는다. 업종·실패 유형·지표·기업·문장 겹침만 세어 본다.
// 경고는 참고 정보다. 후보를 자동으로 버리지 않고, 결정은 사람이 한다.
//
//   node scripts/check-failure-patterns.mjs check --input 후보.json --log hb/failure-log.jsonl
//   node scripts/check-failure-patterns.mjs validate --log hb/failure-log.jsonl
//   node scripts/check-failure-patterns.mjs add --entry 기록.json --log hb/failure-log.jsonl

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES = join(HERE, '..', 'config', 'industry-templates.json');
export const DEFAULT_LOG = join('hb', 'failure-log.jsonl');

export const KINDS = ['오발제', '실패 기획'];
export const FAILURE_TAGS = {
  plan_as_actual: '계획·전망을 실적처럼 썼습니다',
  basis_mismatch: '기간·단위·범위가 다른 수치를 비교했습니다',
  macro_uncontrolled: '거시 변수를 통제하지 않았습니다',
  seasonality: '계절성을 놓쳤습니다',
  single_company_generalized: '일부 기업 사례를 산업 전체로 넓혔습니다',
  press_release_echo: '같은 보도자료를 독립 근거로 셌습니다',
  repeated_conclusion: '이미 반복된 결론이었습니다',
  causation_assumed: '원인을 확인 없이 단정했습니다',
  counter_ignored: '반대 사례를 빠뜨렸습니다',
  lagging_misread: '시차 효과(래깅 등)를 본업 변화로 읽었습니다',
  unit_misread: '지표나 단위를 잘못 읽었습니다',
  source_unread: '본문을 열지 않고 확정했습니다',
  other: '기타',
};
export const SCORE_RULES = { sameIndustry: 2, sharedTag: 3, sharedMetric: 2, sharedEntity: 2, textHigh: 3, textLow: 1 };
export const TEXT_HIGH = 0.35;
export const TEXT_LOW = 0.2;
export const WARN_THRESHOLD = 4;
export const STRONG_THRESHOLD = 6;
export const NOTICE =
  '규칙 기반 대조 결과입니다. 비슷한 점을 알려 줄 뿐 후보를 자동으로 탈락시키지 않으며, 실제로 같은 문제인지는 사람이 판단합니다.';
export const EMPTY_NOTICE =
  '실패 기록이 아직 없어 대조하지 못했습니다. 경고가 없다는 것이 문제가 없다는 뜻은 아닙니다.';

const NON_HUMAN = /^(ai|claude|gpt|chatgpt|codex|cursor|gemini|assistant|bot)$/i;

export class InputError extends Error {}

// 셸이 따옴표 안의 ~ 를 풀어 주지 않아도 사용자 폴더를 가리키게 한다.
export function expandHome(path) {
  return /^~[\/]/.test(path) ? join(homedir(), path.slice(2)) : path;
}

export function validateEntry(entry) {
  const problems = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return ['기록은 JSON 객체여야 합니다.'];
  for (const field of ['id', 'recorded_by', 'industry', 'yama', 'what_went_wrong', 'lesson']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) problems.push(`${field} 를 적어 주세요.`);
  }
  if (typeof entry.recorded_by === 'string' && NON_HUMAN.test(entry.recorded_by.trim())) {
    problems.push('recorded_by 는 기록을 확인한 사람이어야 합니다.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.recorded_at ?? '') || Number.isNaN(Date.parse(entry.recorded_at))) {
    problems.push('recorded_at 은 YYYY-MM-DD 형식이어야 합니다.');
  }
  if (!KINDS.includes(entry.kind)) problems.push(`kind 는 ${KINDS.join(', ')} 중 하나여야 합니다.`);
  if (!Array.isArray(entry.failure_tags) || entry.failure_tags.length === 0) {
    problems.push('failure_tags 를 하나 이상 적어 주세요.');
  } else {
    for (const tag of entry.failure_tags) {
      if (!(tag in FAILURE_TAGS)) problems.push(`모르는 실패 유형입니다: ${tag}`);
    }
  }
  for (const field of ['metrics', 'entities']) {
    if (entry[field] !== undefined && !Array.isArray(entry[field])) problems.push(`${field} 는 배열이어야 합니다.`);
  }
  if (entry.evidence !== undefined) {
    if (!Array.isArray(entry.evidence)) problems.push('evidence 는 배열이어야 합니다.');
    else {
      for (const item of entry.evidence) {
        if (!/^https?:\/\/\S+$/i.test(item?.url ?? '')) problems.push('evidence 의 url 은 http 주소여야 합니다.');
      }
    }
  }
  return problems;
}

export function parseLog(text) {
  const entries = [];
  const errors = [];
  const seen = new Set();
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      errors.push({ line: index + 1, problems: ['JSON 형식이 아닙니다.'] });
      return;
    }
    const problems = validateEntry(entry);
    if (entry?.id && seen.has(entry.id)) problems.push(`id 가 겹칩니다: ${entry.id}`);
    if (problems.length) errors.push({ line: index + 1, problems });
    else {
      entries.push(entry);
      seen.add(entry.id);
    }
  });
  return { entries, errors };
}

export function readLog(path) {
  if (!existsSync(path)) return { entries: [], errors: [], missing: true };
  return { ...parseLog(readFileSync(path, 'utf8')), missing: false };
}

export function canonicalIndustry(name, templates) {
  const wanted = String(name ?? '').trim().toLowerCase();
  for (const [key, ind] of Object.entries(templates?.industries ?? {})) {
    const names = [key, ind.label, ...(ind.aliases ?? [])].map((n) => String(n).toLowerCase());
    if (names.includes(wanted)) return key;
  }
  return wanted;
}

function bigrams(text) {
  const clean = String(text ?? '').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
  const grams = new Set();
  for (let i = 0; i < clean.length - 1; i += 1) grams.add(clean.slice(i, i + 2));
  return grams;
}

export function textSimilarity(a, b) {
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;
  return shared / (left.size + right.size - shared);
}

const overlap = (a, b) => {
  const right = new Set((b ?? []).map((v) => String(v).toLowerCase()));
  return (a ?? []).filter((v) => right.has(String(v).toLowerCase()));
};

export function compareOne(candidate, entry, templates) {
  let score = 0;
  const reasons = [];
  if (canonicalIndustry(candidate.industry, templates) === canonicalIndustry(entry.industry, templates) && candidate.industry) {
    score += SCORE_RULES.sameIndustry;
    reasons.push(`같은 업종: ${entry.industry}`);
  }
  const tags = overlap(candidate.risk_tags, entry.failure_tags);
  if (tags.length) {
    score += tags.length * SCORE_RULES.sharedTag;
    reasons.push(`같은 실패 유형: ${tags.map((t) => FAILURE_TAGS[t] ?? t).join(' / ')}`);
  }
  const metrics = overlap(candidate.metrics, entry.metrics);
  if (metrics.length) {
    score += metrics.length * SCORE_RULES.sharedMetric;
    reasons.push(`같은 지표: ${metrics.join(', ')}`);
  }
  const entities = overlap(candidate.entities, entry.entities);
  if (entities.length) {
    score += entities.length * SCORE_RULES.sharedEntity;
    reasons.push(`같은 기업: ${entities.join(', ')}`);
  }
  const similarity = textSimilarity(candidate.yama, entry.yama);
  if (similarity >= TEXT_HIGH) {
    score += SCORE_RULES.textHigh;
    reasons.push(`야마 문장이 많이 겹칩니다 (${similarity.toFixed(2)})`);
  } else if (similarity >= TEXT_LOW) {
    score += SCORE_RULES.textLow;
    reasons.push(`야마 문장이 일부 겹칩니다 (${similarity.toFixed(2)})`);
  }
  return { score, reasons };
}

export function checkCandidate(candidate, log, templates) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new InputError('후보 입력은 JSON 객체여야 합니다.');
  if (typeof candidate.yama !== 'string' || !candidate.yama.trim()) throw new InputError('후보 입력에 yama 를 적어 주세요.');
  const warnings = [];
  for (const entry of log.entries) {
    const { score, reasons } = compareOne(candidate, entry, templates);
    if (score < WARN_THRESHOLD) continue;
    warnings.push({
      level: score >= STRONG_THRESHOLD ? '강한 유사' : '유사',
      score,
      id: entry.id,
      kind: entry.kind,
      recorded_at: entry.recorded_at,
      past_yama: entry.yama,
      reasons,
      what_went_wrong: entry.what_went_wrong,
      lesson: entry.lesson,
    });
  }
  warnings.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    compared_entries: log.entries.length,
    log_errors: log.errors,
    warnings,
    notice: log.entries.length === 0 ? EMPTY_NOTICE : NOTICE,
  };
}

export function formatCheck(result) {
  const lines = [`대조한 기록: ${result.compared_entries}건 · 경고: ${result.warnings.length}건`];
  for (const w of result.warnings) {
    lines.push(`- [${w.level} · 점수 ${w.score}] ${w.id} (${w.kind}, ${w.recorded_at}) ${w.past_yama}`);
    lines.push(`  겹치는 점: ${w.reasons.join(' / ')}`);
    lines.push(`  당시 문제: ${w.what_went_wrong}`);
    lines.push(`  남긴 교훈: ${w.lesson}`);
  }
  if (result.log_errors.length) lines.push(`읽지 못한 기록 ${result.log_errors.length}줄이 있습니다. validate 명령으로 확인해 주세요.`);
  lines.push(result.notice);
  return lines.join('\n');
}

function loadTemplates() {
  try {
    return JSON.parse(readFileSync(DEFAULT_TEMPLATES, 'utf8'));
  } catch {
    return null;
  }
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (err) {
    throw new InputError(`${label} 파일을 읽지 못했습니다: ${err.message}`);
  }
}

const USAGE = `사용법
  node scripts/check-failure-patterns.mjs check --input 후보.json [--log 로그경로] [--json]
  node scripts/check-failure-patterns.mjs validate [--log 로그경로]
  node scripts/check-failure-patterns.mjs add --entry 기록.json [--log 로그경로]

로그 경로는 --log, 환경변수 HB_FAILURE_LOG, ${DEFAULT_LOG} 순서로 정합니다. 파일이 없으면 빈 로그로 봅니다.`;

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--json') args.json = true;
    else if (['--input', '--log', '--entry'].includes(rest[i])) args[rest[i].slice(2)] = rest[(i += 1)];
    else throw new InputError(`알 수 없는 인자입니다: ${rest[i]}`);
  }
  const logPath = resolve(expandHome(args.log || process.env.HB_FAILURE_LOG || DEFAULT_LOG));
  if (command === 'check') {
    if (!args.input) throw new InputError(USAGE);
    const result = checkCandidate(readJson(args.input, '후보'), readLog(logPath), loadTemplates());
    console.log(args.json ? JSON.stringify(result, null, 2) : formatCheck(result));
  } else if (command === 'validate') {
    const log = readLog(logPath);
    if (log.missing) console.log(`로그 파일이 아직 없습니다: ${logPath}. 빈 로그로 봅니다.`);
    else console.log(`정상 기록 ${log.entries.length}건, 문제 ${log.errors.length}줄`);
    for (const e of log.errors) console.log(`- ${e.line}번째 줄: ${e.problems.join(' ')}`);
    if (log.errors.length) process.exitCode = 2;
  } else if (command === 'add') {
    if (!args.entry) throw new InputError(USAGE);
    const entry = readJson(args.entry, '기록');
    const problems = validateEntry(entry);
    const log = readLog(logPath);
    if (log.entries.some((e) => e.id === entry.id)) problems.push(`id 가 이미 있습니다: ${entry.id}`);
    if (problems.length) throw new InputError(`기록하지 않았습니다.\n${problems.join('\n')}`);
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
    console.log(`기록했습니다: ${entry.id} → ${logPath}`);
  } else {
    console.log(USAGE);
    if (command && command !== '--help' && command !== '-h') process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 2;
  }
}
