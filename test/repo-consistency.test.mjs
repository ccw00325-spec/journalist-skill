import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const TOOLS = ['.claude', '.cursor', '.agents'];

test('세 도구의 SKILL 은 경로만 다릅니다', () => {
  const base = read('.claude/skills/hb/SKILL.md');
  for (const tool of TOOLS) {
    assert.equal(read(`${tool}/skills/hb/SKILL.md`), base.split('~/.claude/').join(`~/${tool}/`), tool);
  }
});

test('세 도구의 hb-agent 는 같습니다', () => {
  const base = read('.claude/agents/hb-agent.md');
  for (const tool of TOOLS) assert.equal(read(`${tool}/agents/hb-agent.md`), base, tool);
});

test('SKILL 이 새 도구를 잇고 세 게이트와 절대 원칙을 유지합니다', () => {
  const skill = read('.claude/skills/hb/SKILL.md');
  for (const needle of [
    'scripts/collect-signals.mjs',
    'config/industry-templates.json',
    'scripts/score-challenge.mjs',
    'scripts/check-failure-patterns.mjs',
    '본문 확인 전 후보',
    '# ⟦GATE 1⟧',
    '# ⟦GATE 2⟧',
    '# ⟦GATE 3⟧',
    '추론 금지',
    '출처 없는 문장 금지',
  ]) {
    assert.ok(skill.includes(needle), needle);
  }
  assert.ok(skill.includes('10개 모두 `O`여야 사용자에게 제시할 수 있다'));
  assert.ok((skill.match(/여기서 반드시 멈춘다/g) ?? []).length >= 2);
});

test('README 맨 위에 배너가 있고 파일이 있습니다', () => {
  const readme = read('README.md');
  assert.ok(readme.startsWith('<p align="center"><img src="assets/ai-skill-banner.jpg" alt="AI Skill — Built for Real Work, Not Just Demos" width="100%"></p>'));
  assert.ok(statSync(join(ROOT, 'assets', 'ai-skill-banner.jpg')).size > 10000);
});

test('README 가 안내하는 파일이 모두 있습니다', () => {
  const readme = read('README.md');
  const paths = readme.match(/\b(?:scripts|config|docs|templates|assets)\/[\w가-힣./-]+\.\w+/g) ?? [];
  assert.ok(paths.length > 5);
  for (const p of new Set(paths)) assert.ok(existsSync(join(ROOT, p)), p);
});

test('추적 파일에 비밀값이나 .env 가 없습니다', () => {
  let files;
  try {
    files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  } catch {
    return;
  }
  assert.equal(files.filter((f) => /(^|\/)\.env/.test(f)).length, 0);
  const secretLike = /(crtfc_key\s*[=:]\s*["']?[0-9a-z]{40})|(DART_API_KEY\s*=\s*["']?[0-9a-z]{40})/i;
  for (const f of files) {
    if (/\.(jpg|png)$/i.test(f) || f.startsWith('test/')) continue;
    if (!existsSync(join(ROOT, f))) continue;
    assert.doesNotMatch(readFileSync(join(ROOT, f), 'utf8'), secretLike, f);
  }
});
