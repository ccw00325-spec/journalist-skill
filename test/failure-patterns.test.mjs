import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  EMPTY_NOTICE,
  InputError,
  STRONG_THRESHOLD,
  checkCandidate,
  expandHome,
  formatCheck,
  parseLog,
  readLog,
  textSimilarity,
  validateEntry,
} from '../scripts/check-failure-patterns.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'check-failure-patterns.mjs');
const templates = JSON.parse(readFileSync(join(ROOT, 'config', 'industry-templates.json'), 'utf8'));

// 아래는 동작 확인용 가짜 입력이다. 실제 사례가 아니며 저장소의 로그에 들어가지 않는다.
const entry = (over = {}) => ({
  id: 'test-1',
  recorded_at: '2026-01-01',
  recorded_by: '시험 담당자',
  kind: '오발제',
  industry: '조선',
  yama: '시험용 가상 야마 문장입니다 알파 베타 감마',
  failure_tags: ['lagging_misread'],
  metrics: ['order_backlog'],
  entities: ['가상회사'],
  what_went_wrong: '시험용 설명입니다.',
  lesson: '시험용 교훈입니다.',
  ...over,
});
const candidate = (over = {}) => ({ industry: '조선', yama: '완전히 다른 후보 문장 델타 입실론 제타', ...over });
const log = (...entries) => ({ entries, errors: [] });

test('저장소에는 실패 기록을 넣지 않습니다', () => {
  try {
    const tracked = execFileSync('git', ['ls-files', 'hb/'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(tracked.trim(), '');
  } catch (err) {
    if (err.code === 'ERR_ASSERTION') throw err;
  }
  const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8');
  assert.match(gitignore, /hb\/failure-log\.jsonl/);
});

test('로그가 없거나 비어 있어도 동작하고, 안전하다고 말하지 않습니다', () => {
  const missing = readLog(join(tmpdir(), 'hb-없는-파일.jsonl'));
  assert.equal(missing.missing, true);
  const result = checkCandidate(candidate(), missing, templates);
  assert.equal(result.compared_entries, 0);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.notice, EMPTY_NOTICE);
  assert.match(result.notice, /문제가 없다는 뜻은 아닙니다/);
  assert.deepEqual(parseLog('').entries, []);
  assert.deepEqual(parseLog('\n  \n').errors, []);
});

test('따옴표 안의 ~ 도 사용자 폴더로 풉니다', () => {
  assert.equal(expandHome('~/.claude/hb/x.jsonl'), join(homedir(), '.claude', 'hb', 'x.jsonl'));
  assert.equal(expandHome('hb/x.jsonl'), 'hb/x.jsonl');
});

test('기록 형식을 검증합니다', () => {
  assert.deepEqual(validateEntry(entry()), []);
  assert.ok(validateEntry(entry({ kind: '기타' })).length);
  assert.ok(validateEntry(entry({ failure_tags: [] })).length);
  assert.ok(validateEntry(entry({ failure_tags: ['모름'] })).length);
  assert.ok(validateEntry(entry({ recorded_at: '어제' })).length);
  assert.ok(validateEntry(entry({ lesson: ' ' })).length);
  assert.ok(validateEntry(entry({ evidence: [{ url: 'javascript:alert(1)' }] })).length);
  assert.ok(validateEntry(null).length);
});

test('사람이 아닌 기록자는 거부합니다', () => {
  for (const name of ['claude', 'AI', 'GPT', 'codex']) {
    assert.ok(validateEntry(entry({ recorded_by: name })).length, name);
  }
});

test('깨진 줄과 겹치는 id 를 찾아내고 나머지는 읽습니다', () => {
  const text = `${JSON.stringify(entry())}\n{깨짐\n${JSON.stringify(entry())}\n${JSON.stringify(entry({ id: 'test-2' }))}\n`;
  const parsed = parseLog(text);
  assert.deepEqual(parsed.entries.map((e) => e.id), ['test-1', 'test-2']);
  assert.deepEqual(parsed.errors.map((e) => e.line), [2, 3]);
  const result = checkCandidate(candidate(), parsed, templates);
  assert.equal(result.log_errors.length, 2);
  assert.match(formatCheck(result), /읽지 못한 기록 2줄/);
});

test('문장 유사도는 같으면 1, 전혀 다르면 0입니다', () => {
  assert.equal(textSimilarity('수주잔고 감소', '수주잔고 감소'), 1);
  assert.equal(textSimilarity('가나다', '라마바'), 0);
  assert.equal(textSimilarity('', '가나다'), 0);
});

test('업종만 같으면 경고하지 않습니다', () => {
  assert.equal(checkCandidate(candidate(), log(entry()), templates).warnings.length, 0);
});

test('업종과 실패 유형이 겹치면 경고하고 이유를 보여 줍니다', () => {
  const [w] = checkCandidate(candidate({ risk_tags: ['lagging_misread'] }), log(entry()), templates).warnings;
  assert.equal(w.level, '유사');
  assert.equal(w.score, 5);
  assert.equal(w.id, 'test-1');
  assert.ok(w.reasons.some((r) => r.includes('같은 업종')));
  assert.ok(w.reasons.some((r) => r.includes('같은 실패 유형')));
  assert.equal(w.lesson, '시험용 교훈입니다.');
});

test('겹치는 점이 많으면 강한 유사로 올리고 점수순으로 정렬합니다', () => {
  const result = checkCandidate(
    candidate({ risk_tags: ['lagging_misread'], metrics: ['order_backlog'], entities: ['가상회사'] }),
    log(entry({ id: 'weak', metrics: [], entities: [] }), entry({ id: 'strong' })),
    templates,
  );
  assert.deepEqual(result.warnings.map((w) => w.id), ['strong', 'weak']);
  assert.ok(result.warnings[0].score >= STRONG_THRESHOLD);
  assert.equal(result.warnings[0].level, '강한 유사');
});

test('야마 문장이 거의 같으면 업종 없이도 함께 잡습니다', () => {
  const sameText = entry().yama;
  const result = checkCandidate(candidate({ yama: sameText }), log(entry()), templates);
  assert.equal(result.warnings[0].score, 5);
});

test('업종 별칭을 같은 업종으로 봅니다', () => {
  const result = checkCandidate(
    candidate({ industry: '석화', risk_tags: ['lagging_misread'] }),
    log(entry({ industry: '석유화학' })),
    templates,
  );
  assert.equal(result.warnings.length, 1);
});

test('경고는 후보를 탈락시키지 않고 규칙 기반임을 밝힙니다', () => {
  const result = checkCandidate(candidate({ risk_tags: ['lagging_misread'] }), log(entry()), templates);
  assert.match(result.notice, /규칙 기반 대조/);
  assert.match(result.notice, /자동으로 탈락시키지 않으며/);
  for (const key of ['rejected', 'blocked', 'pass']) assert.equal(key in result, false);
});

test('같은 입력은 같은 결과입니다', () => {
  const input = candidate({ risk_tags: ['lagging_misread'] });
  assert.equal(JSON.stringify(checkCandidate(input, log(entry()), templates)), JSON.stringify(checkCandidate(input, log(entry()), templates)));
});

test('후보에 야마가 없으면 거부합니다', () => {
  assert.throws(() => checkCandidate({ industry: '조선' }, log(), templates), InputError);
});

test('명령줄: 빈 상태 check, add 검증, validate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hb-failure-'));
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd: dir, env: { ...process.env, HB_FAILURE_LOG: '' } });
  try {
    const logPath = join(dir, 'sub', 'failure-log.jsonl');
    const candPath = join(dir, 'c.json');
    const entryPath = join(dir, 'e.json');
    writeFileSync(candPath, JSON.stringify(candidate({ risk_tags: ['lagging_misread'] })));
    const empty = run('check', '--input', candPath, '--log', logPath);
    assert.equal(empty.status, 0);
    assert.match(empty.stdout, /실패 기록이 아직 없어/);
    assert.equal(existsSync(logPath), false);
    assert.equal(run('validate', '--log', logPath).status, 0);

    writeFileSync(entryPath, JSON.stringify(entry({ recorded_by: 'claude' })));
    const rejected = run('add', '--entry', entryPath, '--log', logPath);
    assert.equal(rejected.status, 2);
    assert.equal(existsSync(logPath), false);

    writeFileSync(entryPath, JSON.stringify(entry()));
    assert.equal(run('add', '--entry', entryPath, '--log', logPath).status, 0);
    assert.equal(run('add', '--entry', entryPath, '--log', logPath).status, 2);
    assert.equal(run('validate', '--log', logPath).status, 0);
    const warned = run('check', '--input', candPath, '--log', logPath, '--json');
    assert.equal(JSON.parse(warned.stdout).warnings.length, 1);

    writeFileSync(logPath, '{깨짐\n');
    assert.equal(run('validate', '--log', logPath).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
