# HB Skill — 산업 발제 · 기사화 파이프라인

20년차 시니어 산업부 기자의 작업 순서를 그대로 옮긴 AI 스킬. **최근 7일 내 트리거 기사에서 사실 하나를 조명하고, 그 기사에 없는 독립 근거를 최소 2개 모아 새 주제를 세운 뒤, 반론까지 통과시켜 기사로 완성한다.** 결과물은 발제 카드 전체와 완성 기사를 담은 PDF다.

Claude Code · Cursor · Codex · 웹 AI(Claude.ai, ChatGPT 등)에서 모두 동작한다.

---

## 왜 만들었나

AI에게 "기사 아이템 좀 찾아줘"라고 하면 대개 두 가지가 나온다 — 기사 요약이거나, 그럴듯하지만 출처가 없는 추측이다. 둘 다 데스크에 못 올린다.

이 스킬은 그 둘을 구조적으로 막는다.

- **요약을 막는 장치** — 독립 근거 2개를 *트리거 기사 밖에서*, 주체나 데이터 출처가 다른 것으로 가져오게 강제한다. 기사 안 내용을 재배열하면 통과하지 못한다.
- **추측을 막는 장치** — 모든 사실 문장에 매체·제목·발행일시·URL을 요구하고, 모든 수치에 `[실적] [전망] [계획] [중간집계]` 태그를 붙이며, `~로 풀이된다` 류를 금지어로 둔다.
- **혼자 결정하는 걸 막는 장치** — 3개 게이트에서 물리적으로 멈추고 사용자에게 묻는다.

---

## 파이프라인

```
/hb → [STEP 0 시각·도메인 확정 — 시스템 시각을 실제로 조회]
    → ⟦GATE 1⟧ 도메인·범위 확인 ......................... 사용자 답 대기
    → [STEP 1 소스 스윕 — T1 통신사 → T1+ 기관·증권 → T2 메이저지 → T3 기타]
    → [STEP 2 발제 후보 5~8건 — 각 독립 근거 2개 이상]
    → ⟦GATE 2⟧ 어느 발제를 밀지 선택 .................... 사용자 답 대기
    → [STEP 3 근거 심화 + 7체크 반론 검증]
    → ⟦GATE 3⟧ 야마 확정 · 기사화 승인 .................. 사용자 답 대기
    → [STEP 4 기사 작성] → [STEP 5 PDF 출력]
```

### 소스 우선순위

| 티어 | 소스 | 역할 |
|------|------|------|
| **T1** | 연합뉴스 · 뉴시스 · 뉴스1 / 로이터 · AP | 속보·1차 사실. 트리거는 여기서 먼저 찾는다 |
| **T1+** | 기관 보고서·통계·증권사 리포트 · DART 공시 | 수치 근거와 동일 기준 비교의 뼈대 |
| **T2** | 조선 · 중앙 · 동아 · 한국 · 한겨레 · 경향 · 매경 · 한경 | 심층·해설·기업 코멘트 |
| **T3** | 그 외 매체 | 빈 구멍 메우기 |

### 7체크 검증

| # | 체크 | 판정 기준 |
|---|------|-----------|
| 1 | 트리거 명확성 | 최근 7일 내 사건·공시·발표가 특정 일시와 함께 확인되는가 |
| 2 | 독립 근거 2개 이상 | 트리거 기사에 없고, 주체·데이터 출처가 다른 근거가 2건 이상인가 |
| 3 | 수치 성격 구분 | 모든 숫자에 실적/전망/계획/중간집계 태그가 붙었는가 |
| 4 | 원인 확인 | 기업 행동의 이유가 공시·통계·회사 설명으로 확인되는가 |
| 5 | 동일 기준 비교 | 기간·단위·연결/별도·환율을 같은 기준으로 맞췄는가 |
| 6 | 최강 반론 생존 | 가장 센 반박을 먼저 대입하고도 야마가 남는가 |
| 7 | 공개 근거만으로 성립 | "추가 취재하면 알 수 있다"에 기대지 않는가 |

6번은 형식적으로 처리하지 않는다. 반대편 근거를 **실제로 검색해서** 찾고, 무너지면 GATE 2로 되돌아갈지 사용자에게 묻는다.

---

## 설치

> 쓰는 도구의 파일만 받으면 된다. 저장소를 통째로 클론할 필요는 없다. 로컬에 이미 파일이 있다면 **복사 설치**가 더 빠르다.

### 개인 범위 — 모든 프로젝트에서 사용 (권장)

**Claude Code**
```powershell
New-Item -ItemType Directory -Force ~/.claude/skills/hb, ~/.claude/agents | Out-Null
Copy-Item .\.claude\skills\hb\SKILL.md  ~/.claude/skills/hb/SKILL.md  -Force
Copy-Item .\.claude\agents\hb-agent.md  ~/.claude/agents/hb-agent.md  -Force
Copy-Item .\templates, .\scripts -Destination ~/.claude/skills/hb/ -Recurse -Force
```

curl로 받으려면:
```bash
mkdir -p ~/.claude/skills/hb
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.claude/skills/hb/SKILL.md \
  -o ~/.claude/skills/hb/SKILL.md
mkdir -p ~/.claude/agents
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.claude/agents/hb-agent.md \
  -o ~/.claude/agents/hb-agent.md
```

**Cursor**
```bash
mkdir -p ~/.cursor/skills/hb ~/.cursor/agents
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.cursor/skills/hb/SKILL.md \
  -o ~/.cursor/skills/hb/SKILL.md
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.cursor/agents/hb-agent.md \
  -o ~/.cursor/agents/hb-agent.md
```

**Codex**
```bash
mkdir -p ~/.agents/skills/hb ~/.agents/agents
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.agents/skills/hb/SKILL.md \
  -o ~/.agents/skills/hb/SKILL.md
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.agents/agents/hb-agent.md \
  -o ~/.agents/agents/hb-agent.md
```

**PDF 출력 파일 (curl 설치자 필수 · 3종 공통)**

`SKILL.md` 만 받으면 STEP 5에서 PDF가 안 나온다. 템플릿과 변환 스크립트를 같이 받아야 한다.

```bash
BASE=https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main
SKILL=~/.claude/skills/hb        # Cursor면 ~/.cursor/skills/hb, Codex면 ~/.agents/skills/hb

mkdir -p $SKILL/templates $SKILL/scripts
curl -fsSL $BASE/templates/report.html  -o $SKILL/templates/report.html
curl -fsSL $BASE/scripts/make-pdf.ps1   -o $SKILL/scripts/make-pdf.ps1   # Windows
curl -fsSL $BASE/scripts/make-pdf.sh    -o $SKILL/scripts/make-pdf.sh    # macOS · Linux
chmod +x $SKILL/scripts/make-pdf.sh
```

빠뜨려도 스킬은 멈추지 않는다. 템플릿이 없으면 CSS를 인라인한 HTML을 직접 만들고, 변환기가 없으면 HTML만 남기고 브라우저 인쇄를 안내한다. 다만 매번 조판을 새로 짜므로 결과물이 회차마다 달라진다.

**웹 AI (Claude.ai · ChatGPT · Gemini)**
[`PROMPT.md`](./PROMPT.md) 의 블록을 복사해 프로젝트 지침 / Custom GPT Instructions / Gem 지침에 붙여넣는다.

### 프로젝트 범위 — 이 저장소에서만

위 경로에서 `~/` 를 `.` 로 바꾸면 된다.

### 설치 후

- **Claude Code** — 실시간 반영. 세션 중에 `.claude/skills/` 폴더를 새로 만들었다면 재시작
- **Cursor** — Reload Window
- **Codex** — 스킬이 안 잡히면 재시작

---

## 사용

| 도구 | 호출 |
|------|------|
| Claude Code | `/hb` |
| Cursor | `/hb` |
| Codex | `$hb` 또는 `/skills` |
| 웹 AI | `/hb` 또는 "발제 뽑아줘" |

```
/hb
/hb 배터리 쪽으로만
/hb 조선 · 방산 위주로, 기간은 3일 이내
```

도메인을 바꾸면 `~/.claude/hb/domains.json` 에 저장돼 다음 호출에도 유지된다. (웹 AI판은 프로젝트 지침의 `[도메인]` 줄을 직접 고쳐야 한다.)

### 기본 도메인

**항공 · 석화 · 조선 · 배터리 · 전선 · 정유 · 석유화학 · LCC항공** — 대기업 중심.

---

## 결과물

`hb-output/<날짜>/hb_<YYYYMMDD>_<HHmm>.pdf` (HTML 원본도 함께 남는다)

PDF 구성 순서:

1. **표지** — 생성 일시, 탐색 창, 도메인, 후보 수
2. **발제 후보 전체** — 선택되지 않은 것까지 전부, 선정된 건에 `★` 표시
   각 카드에 발제 주제 · 조명한 사실 · 트리거 원문 출처와 **발행 날짜·시각** · 독립 근거 요약과 각 출처
3. **선정 발제 검증** — 확정 야마, 7체크 표, 최강 반론과 반박
4. **완성 기사** — 제목 · 부제 · 본문 전문
5. **출처 일람** — 번호순 전체 목록

PDF는 Chrome/Edge 헤드리스로 뽑는다. 외부 의존성이 없고 한글도 깨지지 않는다. 실패하면 HTML 경로를 안내하니 브라우저에서 `Ctrl+P → PDF로 저장` 하면 된다.

---

## 동반 서브에이전트

`hb-agent` — 취재를 나눠 맡기는 읽기 전용 에이전트. 두 모드로 동작한다.

- **GATHER** — 지정된 업종·기업·기간에서 티어 순서대로 수집하고, 원문을 열어 발행일시·수치를 확인한 뒤 구조화된 사실 목록을 돌려준다
- **CHALLENGE** — 주어진 야마에 대한 최강 반론을 실제 근거로 찾아와 `SURVIVES / WEAKENED / COLLAPSES` 를 판정한다

업종이 여러 개거나 비교 대상 기업이 많을 때 병렬로 돌리면 STEP 1이 크게 빨라진다.

---

## 저장소 구조

```
.claude/skills/hb/SKILL.md      Claude Code 스킬 (정본)
.claude/agents/hb-agent.md      Claude Code 서브에이전트
.cursor/skills/hb/SKILL.md      Cursor 스킬
.cursor/agents/hb-agent.md      Cursor 서브에이전트
.agents/skills/hb/SKILL.md      Codex 스킬
.agents/agents/hb-agent.md      Codex 서브에이전트
PROMPT.md                       웹 AI용 프롬프트본
templates/report.html           PDF 리포트 템플릿 (CSS 내장, A4)
scripts/make-pdf.ps1            HTML → PDF 변환 · Windows
scripts/make-pdf.sh             HTML → PDF 변환 · macOS · Linux
config/domains.default.json     기본 산업 도메인
```

저장소 전체를 작업 프로젝트에 클론할 필요는 없다. **쓰는 도구의 파일만** 가져가면 된다.

---

## 한계

- **웹 검색이 없으면 성립하지 않는다.** 검색이 막힌 환경에서는 발제를 지어내지 않고 그 사실을 알리고 멈춘다.
- **유료 기사·비공개 리포트는 못 읽는다.** 7체크의 7번이 "공개 근거만으로 성립"인 이유다.
- **최종 판단은 사람이 한다.** 이 스킬은 검증 가능한 뼈대를 만들 뿐, 데스킹을 대신하지 않는다.

---

**License:** MIT
