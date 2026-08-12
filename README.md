# HB Skill — 산업 발제 · 기사화 파이프라인

20년차 시니어 산업부 기자의 작업 순서를 그대로 옮긴 AI 스킬. **2단계로 동작한다 — 먼저 발제 후보를 만들어 사용자에게 내밀고, 사용자가 고른 것만 추가 취재를 거쳐 기사로 쓴다.** 결과물은 후보 전체·판정·기사·FACT별 근거표를 담은 PDF다.

Claude Code · Cursor · Codex · 웹 AI(Claude.ai, ChatGPT 등)에서 모두 동작한다.

---

## 왜 만들었나

AI에게 "기사 아이템 좀 찾아줘"라고 하면 대개 두 가지가 나온다 — 기사 요약이거나, 그럴듯하지만 출처가 없는 추측이다. 둘 다 데스크에 못 올린다.

이 스킬은 그 둘을 구조적으로 막는다.

- **요약을 막는 장치** — 독립 근거 2개를 *트리거 밖에서*, 주체나 데이터 원출처가 다른 것으로 가져오게 강제한다. 같은 보도자료를 받아쓴 기사 2건은 1건으로 센다.
- **추측을 막는 장치** — 질문을 만드는 것은 허용하되 **그 질문의 답을 추측하는 것은 금지**한다. 모든 핵심 FACT에 자료명·기관·날짜·URL·확인된 근거를 요구하고, 못 찾으면 `공개 자료에서 확인하지 못함`이라고 쓰게 한다.
- **혼자 결정하는 걸 막는 장치** — 3개 게이트에서 물리적으로 멈춘다. AI는 어떤 발제가 좋은지 대신 정하지 않는다.

---

## 발제의 정의

> 최근 발생한 사실이나 현상에서 기사 가치가 있을 수 있는 **구체적인 사실 하나를 포착**하고, 그 사실에서 아직 충분히 조명되지 않은 **질문을 발견**한 뒤, 해당 주제를 **독립적인 추가 사실과 자료로 검증**해 기사화 가능성을 판단하는 과정.

```
최근 사실/현상 → FACT → QUESTION → 독립 FACT 탐색 → 검증
  → 기사 각도 → 사용자 선택 → 추가 검증 → 기사
```

기사를 요약하는 것도, AI가 새 이야기를 지어내는 것도 발제가 아니다. **기존 기사는 발제가 아니라 발제를 발견하기 위한 Trigger다.**

예를 들어 "A은행이 AI 상담 처리 범위를 확대했다"는 FACT에서 "다른 은행에서도 최근 AI 상담 처리 범위를 확대하고 있는가?"라는 질문을 세울 수 있다. 여기서 곧장 "은행권 전체가 AI 상담으로 전환 중"이라고 쓰면 **그건 추론이다.** B은행 발표, C은행 도입 자료, 금융기관 통계를 실제로 찾아 확인한 뒤, **확인된 범위 안에서만** 발제를 구성한다.

### 네 가지를 분리한다

| 구분 | 정의 | 사용 |
|------|------|------|
| **FACT** | 자료로 확인된 사실 (출처 필수) | 직접 서술 가능 |
| **QUESTION** | FACT에서 파생된 취재 질문 | 사실이 아니다. 답을 추측하지 않고 검색한다 |
| **HYPOTHESIS** | 검증 전 예상 | 가급적 쓰지 않는다. 쓰면 `[가설·검증 전]` 표시 필수 |
| **INTERPRETATION** | 사람이 내리는 해석 | 객관적 사실처럼 섞지 않는다 |

---

## 파이프라인

```
PHASE 1 — 발제 탐색 및 사용자 선택
  /hb → [STEP 0 시각·도메인 확정 — 시스템 시각을 실제로 조회]
      → ⟦GATE 1⟧ 도메인·범위 확인 ......................... 사용자 답 대기
      → [STEP 1 소스 스윕 — 공시·정부 → 통신사 → 메이저지 → 전문지]
      → [STEP 2 FACT 분해 · QUESTION 설정 · 독립 근거 확보 · 후보 3~5건]
      → ⟦GATE 2⟧ 사용자 발제 선택 ......................... 사용자 답 대기

PHASE 2 — 선택된 발제 검증 및 기사화
      → [STEP 3 추가 취재 · 원출처 역추적 · 반대 근거 · FACT 검증]
      → ⟦GATE 3⟧ 기사 각도 확정 · 기사화 승인 ............. 사용자 답 대기
      → [STEP 4 기사 작성] → [STEP 5 Source Audit] → [STEP 6 PDF]
```

내부 상태는 이렇게 흐른다. `WAIT_FOR_USER_SELECTION` 을 건너뛰는 것은 이 스킬의 실패다.

```
DISCOVERY → PITCH_CANDIDATES → WAIT_FOR_USER_SELECTION → SELECTED_PITCH
  → DEEP_RESEARCH → FACT_CHECK → ARTICLE_DRAFT → SOURCE_AUDIT → FINAL_ARTICLE
```

사용자가 고른 뒤에는 **그 선택을 끝까지 유지한다.** 더 좋아 보이는 후보가 있어도 바꾸지 않고, PHASE 1 자료를 복사해 기사로 만들지도 않는다. 선택된 발제는 반드시 추가 취재를 거친다.

### 트리거의 범위와 출처 우선순위

트리거는 언론 기사에만 한정하지 않는다. 정부 발표·공공기관 자료·기업 공시·보도자료·정책·법규 변화·공식 통계·산업 보고서·실적 발표가 모두 트리거가 된다.

| 순위 | 소스 | 역할 |
|------|------|------|
| **1** | 공시(DART) · 정부 · 공공기관 · 기업 공식자료 | 1차 원자료. 가장 강한 근거 |
| **2** | 연합뉴스 · 뉴시스 · 뉴스1 / 로이터 · AP | 속보·1차 사실 |
| **2+** | 기관 통계 · 산업 보고서 · 증권사 리포트 | 수치 근거와 동일 기준 비교의 뼈대 |
| **3** | 조선 · 중앙 · 동아 · 한국 · 한겨레 · 경향 · 매경 · 한경 | 심층·해설·기업 코멘트 |
| **4** | 산업 전문지 | 빈 구멍 메우기 |

기사에서 FACT를 찾으면 **그 기사가 인용한 공시·보도자료·통계 원문까지 역추적**한다. 언론 요약과 원자료가 다르면 원자료를 따르고 차이를 남긴다.

### 7체크 검증 — 후보마다 매긴다

| # | 체크 | 판정 기준 |
|---|------|-----------|
| 1 | 트리거 명확성 | 최근 7일 내 사건·공시·발표가 특정 일시와 함께 확인되는가 |
| 2 | 독립 근거 2개 이상 | 트리거에 없고, 주체·데이터 원출처가 다른 근거가 2건 이상인가 |
| 3 | 수치 성격 구분 | 계약금액/매출/수주잔고/투자/목표/전망/시장규모 중 무엇인지 밝혔는가 |
| 4 | 원인 확인 | 기업 행동의 이유가 공시·통계·회사 설명으로 확인되는가 |
| 5 | 동일 기준 비교 | 기간·단위·연결/별도·환율을 같은 기준으로 맞췄는가 |
| 6 | 최강 반론 생존 | 가장 센 반박을 먼저 대입하고도 발제가 남는가 |
| 7 | 공개 근거만으로 성립 | "추가 취재하면 알 수 있다"에 기대지 않는가 |

표기는 `✅ 충족 / ⚠️ 부분 / ❌ 미충족 / — 해당없음`, 종합 등급은 **A**(✅ 6개↑·❌ 0) · **B**(✅ 4개↑·❌ 1 이하) · **C**(❌ 2개↑). C등급은 완성된 발제로 제시하지 않고 탈락 이유만 밝힌다. 체크 1·2가 `❌`면 등급과 무관하게 후보 자격 미달이다.

이 판정표는 **PDF의 후보 카드마다** 실린다. 어느 발제가 어디서 약한지 한눈에 비교할 수 있다.

6번은 형식적으로 처리하지 않는다. 반대편 근거를 **실제로 검색해서** 찾고, 무너지면 GATE 2로 되돌아갈지 사용자에게 묻는다.

### 억지로 만들지 않는다

트리거가 없거나, 독립 근거가 2건이 안 되거나, 발제를 세우려면 추론이 필요하면 — **"현재 공개 근거만으로는 발제로 성립시키기 어렵다"**고 알린다. 사용자가 선택한 뒤라도 검증에서 전제가 무너지면 기사를 쓰지 않고, 어떤 근거 때문인지 출처와 함께 보여준다.

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

CLI가 접근 권한을 승인받은 **작업 폴더 바로 아래**에 `HB_Output/` 을 만들고 그 안에 넣는다.

```
<작업폴더>/HB_Output/2026_08_12output.pdf
<작업폴더>/HB_Output/2026_08_12output.html    ← 수정·재출력용 원본
```

파일명은 `YYYY_MM_DDoutput`. 같은 날 두 번 돌리면 `2026_08_12output_2.pdf` 로 붙어 앞 결과를 덮어쓰지 않는다.

폴더는 `mkdir` 로 만든 뒤 존재 여부를 확인하고 넘어간다. 만들지 못하면 (권한 없는 위치 등) 그 자리에서 멈추고 사용자에게 알린다 — 파일부터 쓰다 조용히 실패하는 일이 없도록 한 장치다.

PDF 구성 순서:

1. **표지** — 생성 일시(오프셋 포함), 탐색 창, 도메인, 후보 수, 등급 분포
2. **발제 후보 전체** — 선택되지 않은 것까지 전부, 선정된 건에 `★` 표시
   각 카드에 발제 제목 · Trigger와 **발행 날짜·시각** · 조명한 FACT · QUESTION · 독립 근거 A/B와 각 출처 · 반대·제한 근거 · 현재 확인 가능한 범위 · **7체크 판정표와 등급**
3. **선정 발제 검증** — 확정 각도, 7체크 확정 판정, 추가 취재로 새로 확인한 것, 최강 반론과 반박
4. **완성 기사** — 제목 · 부제 · 본문 전문
5. **기사 근거 및 출처** — 기사에 쓴 주요 FACT별 근거표 (Source Audit 결과)
6. **출처 일람** — 번호순 전체 목록

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
templates/report.html           PDF 리포트 템플릿 (CSS 내장, A4, 후보별 판정표 포함)
examples/regression-tests.md    회귀 방지 테스트 시나리오
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
