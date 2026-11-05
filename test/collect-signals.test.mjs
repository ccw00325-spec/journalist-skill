import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CANDIDATE_STATUS,
  ConfigError,
  applyState,
  cleanText,
  collectCalendar,
  collectDart,
  collectRss,
  kstYmd,
  matchIndustries,
  parseDate,
  parseFeed,
  redact,
  runCollection,
  validateConfig,
} from '../scripts/collect-signals.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'collect-signals.mjs');
const NOW = new Date('2026-11-05T03:00:00Z');
const FAKE_KEY = 'a'.repeat(40);

const INDUSTRIES = [
  { name: '조선', keywords: ['조선', '선박'], exclude: ['조선일보'], companies: ['시험조선'] },
  { name: '전선', keywords: ['전선'], exclude: ['최전선'], companies: [] },
];

function rssXml(items) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>시험 피드</title>${items
    .map(
      (i) =>
        `<item><title><![CDATA[${i.title}]]></title><link>${i.link}</link><description><![CDATA[${i.summary ?? ''}]]></description>${
          i.date ? `<pubDate>${i.date}</pubDate>` : ''
        }</item>`,
    )
    .join('')}</channel></rss>`;
}

function fakeResponse(body, status = 200) {
  const bytes = new TextEncoder().encode(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/xml; charset=utf-8' },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

function ctx(fetchImpl) {
  return {
    fetch: fetchImpl,
    now: NOW,
    windowStart: new Date(NOW.getTime() - 7 * 86400000),
    futureLimit: new Date(NOW.getTime() + 86400000),
    lookaheadDays: 7,
    userAgent: 'test',
    timeoutMs: 1000,
    industries: INDUSTRIES,
    signalTerms: ['감산', '수주'],
  };
}

const baseConfig = (fetchFeeds = []) => ({
  dart: { enabled: true, api_url: 'https://dart.test/api/list.json', viewer_url: 'https://dart.test/view?rcpNo=', pblntf_ty: ['B'], max_pages: 2, report_keywords: ['단일판매공급계약'] },
  rss_feeds: fetchFeeds,
  calendar: { reference_pages: [], recurring: [], events: [] },
  signal_terms: ['감산', '수주'],
  industries: INDUSTRIES,
});

test('RSS, CDATA, 엔티티, Atom 형식을 읽습니다', () => {
  const items = parseFeed(rssXml([{ title: '시험 &amp; 조선 <b>수주</b>', link: 'https://a.test/1', date: 'Thu, 5 Nov 2026 09:00:00 +0900' }]));
  assert.equal(items[0].title, '시험 & 조선 수주');
  assert.equal(items[0].link, 'https://a.test/1');
  const atom = parseFeed('<feed><entry><title>제목</title><link href="https://a.test/2"/><updated>2026-11-05T01:00:00Z</updated></entry></feed>');
  assert.equal(atom[0].link, 'https://a.test/2');
  assert.equal(atom[0].published_raw, '2026-11-05T01:00:00Z');
});

test('실제 피드에서 본 날짜 형식을 모두 해석합니다', () => {
  for (const raw of ['Thu,5 Nov 2026 14:47:34 +0900', 'Wed, 04 Nov 2026 11:36:10 +09:00', '2026-11-05T08:50:00+09:00']) {
    assert.ok(parseDate(raw), raw);
  }
  assert.equal(parseDate('날짜 아님'), null);
  assert.equal(parseDate(''), null);
});

test('제어 문자와 태그를 지우고 길이를 제한합니다', () => {
  assert.equal(cleanText('가\u0007나<script>x</script>'), '가 나 x');
  assert.ok(cleanText('가'.repeat(500)).length <= 301);
});

test('제외어를 빼고 업종을 찾습니다', () => {
  assert.deepEqual(matchIndustries('조선일보가 전했다', INDUSTRIES).matched, []);
  assert.deepEqual(matchIndustries('최전선에 섰다', INDUSTRIES).matched, []);
  assert.deepEqual(matchIndustries('시험조선 선박 수주', INDUSTRIES).matched, ['조선']);
});

test('RSS 후보는 모두 본문 확인 전 후보이고 본문을 저장하지 않습니다', async () => {
  const xml = rssXml([
    { title: '시험조선 수주 소식', link: 'https://a.test/hit', summary: '요약 문장입니다', date: 'Thu, 5 Nov 2026 09:00:00 +0900' },
    { title: '조선 일반 소식', link: 'https://a.test/no-signal', date: 'Thu, 5 Nov 2026 09:00:00 +0900' },
    { title: '오래된 시험조선 수주', link: 'https://a.test/old', date: 'Thu, 1 Oct 2026 09:00:00 +0900' },
    { title: '날짜 없는 시험조선 수주', link: 'https://a.test/undated' },
  ]);
  const { report, candidates } = await collectRss({ name: '시험', url: 'https://a.test/rss', tier: 'T2' }, ctx(async () => fakeResponse(xml)));
  assert.equal(report.state, 'ok');
  assert.deepEqual(candidates.map((c) => c.url), ['https://a.test/hit', 'https://a.test/undated']);
  for (const c of candidates) {
    assert.equal(c.status, CANDIDATE_STATUS);
    assert.equal(c.confirmed_fact, false);
    assert.ok(c.required_before_use.length >= 2);
    assert.equal('summary' in c, false);
    assert.equal(JSON.stringify(c).includes('요약 문장입니다'), false);
  }
  assert.equal(candidates[1].date_note, '발행시각 미확인');
});

test('꺼진 피드와 빈 주소는 요청하지 않고 이유를 남깁니다', async () => {
  const fetchImpl = async () => assert.fail('요청하면 안 됩니다');
  const off = await collectRss({ name: '꺼짐', url: 'https://a.test/rss', enabled: false }, ctx(fetchImpl));
  const blank = await collectRss({ name: '빈칸', url: '', enabled: false }, ctx(fetchImpl));
  assert.equal(off.report.state, 'skipped');
  assert.equal(blank.report.state, 'skipped');
  assert.match(blank.report.detail, /직접 채워/);
});

test('피드 실패는 그 소스만 실패로 남습니다', async () => {
  const failed = await collectRss({ name: '실패', url: 'https://a.test/rss' }, ctx(async () => fakeResponse('없음', 404)));
  assert.equal(failed.report.state, 'failed');
  assert.match(failed.report.detail, /404/);
  const noItems = await collectRss({ name: 'HTML', url: 'https://a.test/rss' }, ctx(async () => fakeResponse('<html></html>')));
  assert.equal(noItems.report.state, 'failed');
});

test('키가 없으면 DART를 건너뛰었다고 분명히 적고 요청하지 않습니다', async () => {
  const fetchImpl = async () => assert.fail('요청하면 안 됩니다');
  const { report, candidates } = await collectDart(baseConfig().dart, '', ctx(fetchImpl));
  assert.equal(report.state, 'skipped');
  assert.match(report.detail, /DART_API_KEY/);
  assert.match(report.detail, /건너뛰/);
  assert.equal(candidates.length, 0);
});

test('키 형식이 틀리면 값을 남기지 않고 건너뜁니다', async () => {
  const { report } = await collectDart(baseConfig().dart, 'short-secret', ctx(async () => assert.fail('요청하면 안 됩니다')));
  assert.equal(report.state, 'skipped');
  assert.equal(report.detail.includes('short-secret'), false);
});

test('DART 응답을 명세대로 읽고 원문 주소를 만듭니다', async () => {
  let requested = '';
  const body = {
    status: '000',
    message: '정상',
    page_no: 1,
    total_page: 1,
    list: [
      { corp_name: '시험조선', report_nm: '단일판매ㆍ공급계약체결', rcept_no: '20261105000001', rcept_dt: '20261105', rm: '유', corp_cls: 'Y' },
      { corp_name: '다른회사', report_nm: '[기재정정]단일판매ㆍ공급계약체결(자율공시)', rcept_no: '20261104000002', rcept_dt: '20261104', rm: '정', corp_cls: 'Y' },
      { corp_name: '시험조선', report_nm: '임원ㆍ주요주주특정증권등소유상황보고서', rcept_no: '20261104000003', rcept_dt: '20261104', rm: '', corp_cls: 'Y' },
    ],
  };
  const { report, candidates } = await collectDart(
    baseConfig().dart,
    FAKE_KEY,
    ctx(async (url) => {
      requested = url;
      return fakeResponse(JSON.stringify(body));
    }),
  );
  const q = new URL(requested).searchParams;
  assert.equal(q.get('bgn_de'), '20261029');
  assert.equal(q.get('end_de'), kstYmd(NOW));
  assert.equal(q.get('pblntf_ty'), 'B');
  assert.equal(report.state, 'ok');
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].url, 'https://dart.test/view?rcpNo=20261105000001');
  assert.equal(candidates[0].published_at, '2026-11-05');
  assert.deepEqual(candidates[0].industries, ['조선']);
  assert.equal(candidates[0].status, CANDIDATE_STATUS);
  assert.deepEqual(candidates[1].industries, []);
  assert.ok(candidates[1].signal_reasons.includes('업종 미분류'));
  assert.ok(candidates[1].flags.length > 0);
});

test('DART 오류 코드와 조회 결과 없음을 구분합니다', async () => {
  const none = await collectDart(baseConfig().dart, FAKE_KEY, ctx(async () => fakeResponse(JSON.stringify({ status: '013', message: '없음' }))));
  assert.equal(none.report.state, 'ok');
  const bad = await collectDart(baseConfig().dart, FAKE_KEY, ctx(async () => fakeResponse(JSON.stringify({ status: '010', message: '등록되지 않은 키' }))));
  assert.equal(bad.report.state, 'failed');
  assert.match(bad.report.detail, /010/);
});

test('오류와 결과 어디에도 키가 남지 않습니다', async () => {
  const leakyFetch = async (url) => {
    if (String(url).includes('dart.test')) throw new Error(`접속 실패 ${url}`);
    return fakeResponse(rssXml([]));
  };
  const result = await runCollection({ config: baseConfig(), env: { DART_API_KEY: FAKE_KEY }, fetchImpl: leakyFetch, now: NOW });
  const text = JSON.stringify(result);
  assert.equal(text.includes(FAKE_KEY), false);
  assert.equal(result.sources.find((s) => s.type === 'dart').state, 'failed');
  const echoed = await runCollection({
    config: baseConfig(),
    env: { DART_API_KEY: FAKE_KEY },
    fetchImpl: async () => fakeResponse(JSON.stringify({ status: '900', message: `키 ${FAKE_KEY} 오류` })),
    now: NOW,
  });
  assert.equal(JSON.stringify(echoed).includes(FAKE_KEY), false);
  assert.equal(redact(`x?crtfc_key=${FAKE_KEY}&y=1`, ''), 'x?crtfc_key=***&y=1');
});

test('설정 파일에 키를 적으면 거부합니다', () => {
  assert.throws(() => validateConfig({ ...baseConfig(), dart: { crtfc_key: 'x' } }), ConfigError);
});

test('일정 후보는 사용자 일정과 관찰 일정을 구분합니다', () => {
  const { candidates } = collectCalendar(
    {
      reference_pages: [{ name: '일정표', url: 'https://k.test/list' }],
      recurring: [{ name: '반복', reference_url: 'https://k.test/r', days_of_month: [1, 11, 21], basis: 'observed_not_official' }],
      events: [
        { name: '안쪽 일정', date: '2026-11-10', url: 'https://k.test/e' },
        { name: '먼 일정', date: '2027-03-01', url: 'https://k.test/f' },
      ],
    },
    ctx(async () => {}),
  );
  const dates = candidates.filter((c) => c.date_basis === 'observed_not_official').map((c) => c.event_date);
  assert.deepEqual(dates, ['2026-11-01', '2026-11-11']);
  assert.ok(candidates.some((c) => c.title === '발표 일정: 안쪽 일정' && c.date_basis === 'user_entered'));
  assert.equal(candidates.some((c) => c.title.includes('먼 일정')), false);
  assert.ok(candidates.every((c) => c.status === CANDIDATE_STATUS && c.confirmed_fact === false));
});

test('키 없이 전체 실행이 끝나고 상단에 후보 표시가 붙습니다', async () => {
  const xml = rssXml([{ title: '시험조선 수주 소식', link: 'https://a.test/1', date: 'Thu, 5 Nov 2026 09:00:00 +0900' }]);
  const config = baseConfig([
    { name: '정상', url: 'https://a.test/rss', tier: 'T2' },
    { name: '중복', url: 'https://b.test/rss', tier: 'T3' },
    { name: '꺼짐', url: 'https://c.test/rss', enabled: false },
  ]);
  const result = await runCollection({ config, env: {}, fetchImpl: async () => fakeResponse(xml), now: NOW });
  assert.equal(result.status, CANDIDATE_STATUS);
  assert.match(result.notice, /확정 사실이 아니라/);
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].also_in, ['중복']);
  assert.equal(result.sources.find((s) => s.type === 'dart').state, 'skipped');
  const state = applyState(result, { seen: {} }, NOW.toISOString());
  assert.equal(result.candidates[0].new_since_last_run, true);
  applyState(result, state, NOW.toISOString());
  assert.equal(result.candidates[0].new_since_last_run, false);
});

test('명령줄 실행: 설정 오류는 코드 2, 파일을 덮어쓰지 않습니다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hb-collect-'));
  try {
    const badPath = join(dir, 'bad.json');
    writeFileSync(badPath, '{"rss_feeds":"문자"}');
    const bad = spawnSync(process.execPath, [SCRIPT, '--config', badPath, '--out', dir], { encoding: 'utf8' });
    assert.equal(bad.status, 2);
    const okPath = join(dir, 'ok.json');
    writeFileSync(okPath, JSON.stringify({ ...baseConfig(), dart: { enabled: false } }));
    const env = { ...process.env };
    delete env.DART_API_KEY;
    for (let i = 0; i < 2; i += 1) {
      execFileSync(process.execPath, [SCRIPT, '--config', okPath, '--out', join(dir, 'out'), '--state', join(dir, 'state.json')], { env, encoding: 'utf8' });
    }
    const saved = readdirSync(join(dir, 'out'));
    assert.equal(saved.length, 2);
    const parsed = JSON.parse(readFileSync(join(dir, 'out', saved[0]), 'utf8'));
    assert.equal(parsed.status, CANDIDATE_STATUS);
    assert.ok(existsSync(join(dir, 'state.json')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('저장소 기본 설정은 유효하고, 제한이 적힌 피드는 꺼져 있으며, 빈 자리가 있습니다', () => {
  const config = JSON.parse(readFileSync(join(ROOT, 'config', 'collector.sources.json'), 'utf8'));
  validateConfig(config);
  for (const name of ['연합뉴스 경제', '연합뉴스 산업', '매일경제 경제', '매일경제 기업/경영', '서울경제 기업']) {
    assert.equal(config.rss_feeds.find((f) => f.name === name).enabled, false, name);
  }
  assert.ok(config.rss_feeds.some((f) => f.url === '' && f.enabled === false));
  assert.ok(config.rss_feeds.every((f) => f.terms_note));
  assert.deepEqual(config.calendar.events, []);
});
