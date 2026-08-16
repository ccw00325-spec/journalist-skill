# 산업 일일 발제 도우미

산업 뉴스를 훑고도 “그래서 무엇을 기사로 써야 하나”가 선명하지 않을 때 쓰는 발제 지원 스킬입니다. 최근 기사와 공시, 기업 IR, 정부·협회 통계, 산업 자료에서 평소와 다른 숫자나 움직임을 찾고, 그 사실이 기사로 확장될 수 있는지 공개 자료로 검증합니다.

단순한 뉴스 요약은 만들지 않습니다. 하나의 최신 자료에서 눈여겨볼 FACT를 골라 질문으로 바꾸고, 원문에 없던 독립 근거와 시간축, 산업 전체 흐름, 반대 사례를 차례로 대조합니다. 검증을 통과한 후보만 사용자에게 보여주며, 사용자가 선택한 발제에 한해 추가 조사와 기사 작성을 진행합니다.

Claude Code, Cursor, Codex와 웹 AI에서 사용할 수 있습니다.

---

## 이 스킬로 할 수 있는 일

- 최근 7일간 나온 산업 기사와 공식 자료를 넓게 훑습니다.
- 기사 제목보다 본문 속 작은 수치, 가동률 변화, 재고, 가격, 수출입, 설비 조정, 투자·수주 변동처럼 평소와 다른 FACT를 먼저 찾습니다.
- 하나의 결론을 정해 놓고 자료를 끼워 맞추지 않습니다.
- 트리거 자료 밖에서 독립적인 근거를 최소 2개, 가능하면 성격이 다른 3~5개까지 확인합니다.
- 현재 수치를 전주·전월·전년 동기, 과거 평균, 경쟁사, 업계 평균과 비교합니다.
- 계획·전망·중간집계와 실제 실적을 구분합니다.
- 계절성이나 특정 기업만의 사정처럼 발제를 무너뜨릴 수 있는 반론을 먼저 점검합니다.
- 검증을 통과한 후보를 점수순으로 최대 5개 제시합니다.
- 사용자가 고른 발제만 심화 조사하고 기사로 작성합니다.
- 발제 후보, 판정표, 기사, 출처를 한데 모은 PDF와 HTML을 남깁니다.

## 이 스킬의 장점

### 요약과 발제를 구분합니다

최근 기사를 다시 정리하는 데서 끝나지 않습니다. 기사 안의 여러 사실 중 하나를 골라 별도의 질문으로 확장하고, 원문에 없던 자료로 그 질문이 성립하는지 확인합니다.

예를 들어 어떤 기업의 감산 발표를 발견했다면 “감산했다”는 발생 사실만 전달하지 않습니다. 이전 생산량과 재고, 시장가격, 경쟁사 가동률 등을 확인해 이번 조정이 평소와 무엇이 다른지 살핍니다. 그 차이가 공개 자료로 확인될 때만 발제 후보로 남깁니다.

### 출처를 따라가며 판단할 수 있습니다

중요한 FACT에는 자료명, 기관이나 매체, 날짜, URL을 붙입니다. 검색 결과의 제목이나 요약문만 보고 수치를 확정하지 않고 원문을 직접 확인합니다. 공시가 있는 사안은 보도보다 공시 원문을 우선합니다.

### 숫자를 같은 기준으로 비교합니다

계약금액과 매출, 목표치와 실제 실적, 누적 수치와 월간 수치를 섞지 않습니다. 서로 직접 비교할 때는 기간, 단위, 집계 범위를 맞춥니다. 기준이 다르면 억지로 우열을 만들지 않고 각각의 FACT로 분리합니다.

### 반론을 숨기지 않습니다

발제에 유리한 자료만 모으지 않습니다. 계절적 변화인지, 해당 기업만의 문제인지, 경쟁사는 반대로 움직이는지, 산업 전체 통계와 충돌하지 않는지 확인합니다. 가장 강한 반론을 적용했을 때 야마가 무너지면 후보에서 제외합니다.

### 사람이 선택권을 가집니다

도메인 결정, 발제 선택, 기사화 승인 단계에서 사용자 답을 기다립니다. AI가 임의로 후보 하나를 골라 기사까지 밀어붙이지 않습니다. 같은 자료를 사실 그대로 묶는 방향과 다른 축으로 보는 방향도 함께 제시할 수 있습니다.

### 원인이 공개되지 않은 사안도 제한적으로 다룹니다

회사가 행동의 이유를 직접 밝히지 않았다고 해서 무조건 버리지는 않습니다. 서로 독립적인 기사·공시·통계 2건 이상이 같은 가능성을 가리키고 반대 정황까지 확인했다면 `조건부 O`로 남길 수 있습니다.

다만 정황을 원인으로 단정하지 않습니다. 결과물에는 다음처럼 사실과 해석의 경계를 표시합니다.

> 직접 원인은 공개자료상 확인되지 않았다. 다만 A와 B 정황이 함께 확인됐다.

`조건부 O`는 원인 확인 항목에만 적용하며 8점으로 계산합니다. 공식 원인이 확인된 후보보다 순위가 낮습니다.

---

## 작업 흐름

```text
/hb
  → 현재 시각과 최근 7일 범위 확인
  → 사용자와 탐색 업종 결정
  → 기사·공시·IR·통계·산업 자료 탐색
  → 평소와 다른 FACT 발견
  → 검증할 질문 설정
  → 독립 근거와 시간축 수집
  → 산업 전체 흐름과 반론 대조
  → 10개 기준을 통과한 후보를 점수순으로 제시
  → 사용자 발제 선택
  → 선택한 발제 추가 조사
  → 사용자 기사화 승인
  → 기사 작성과 PDF 출력
```

발제의 출발점이 되는 트리거는 최근 7일 이내 자료로 제한합니다. 후보가 부족해도 10일로 늘리지 않습니다. 대신 같은 7일 안에서 업종, 기업, 검색어, 자료 유형을 바꿔 다시 찾습니다. 과거 비교와 산업 맥락, 반론에 쓰는 자료에는 기간 제한이 없습니다.

## 탐색하는 자료

| 우선순위 | 자료 | 쓰임 |
|---|---|---|
| 1 | 기업 공시·IR·보도자료 | 계약, 실적, 계획, 회사 설명 확인 |
| 2 | 정부·공공기관·협회·공식 통계 | 산업 규모, 수출입, 가격, 생산·가동 지표 확인 |
| 3 | 연합뉴스·뉴시스·뉴스1·Reuters·AP | 최근 사건과 발표의 빠른 확인 |
| 4 | 증권사 리포트·산업 브리핑 | 수치 해설과 비교 기준 보강 |
| 5 | 주요 신문과 산업 전문매체 | 취재 내용, 업계 반응, 세부 맥락 확인 |

유료 기사만으로는 핵심 근거를 확정하지 않습니다. 같은 내용을 확인할 수 있는 무료 원자료를 더 찾고, 확보하지 못하면 공개 자료에서 확인되지 않았다고 표시합니다.

## 후보 판정 기준

| # | 항목 | 확인하는 내용 |
|---:|---|---|
| 1 | 트리거 명확성 | 최근 7일 안에 발생하거나 발표된 사실인가 |
| 2 | 독립 근거 | 트리거 자료에 없는 독립 근거가 2개 이상인가 |
| 3 | 수치 성격 | 실적·잠정치·계획·전망·중간집계를 구분했는가 |
| 4 | 원인 확인 | 공식 원인이 있거나 `조건부 O` 요건을 충족했는가 |
| 5 | 동일 기준·시간축 | 같은 산업과 같은 기준으로 평소 대비 변화를 확인했는가 |
| 6 | 최강 반론 | 계절성·특수상황·반대 사례를 적용해도 야마가 남는가 |
| 7 | 공개 근거 | 추가 취재를 전제로 하지 않아도 기사 뼈대가 서는가 |
| 8 | 이번 주의 변화 | 이번 주에 새로 달라진 점이 분명한가 |
| 9 | 기존 기사와 차이 | 이미 반복된 결론이나 단순 수치 갱신이 아닌가 |
| 10 | 산업적 의미 | 산업 전체 자료와 대조해도 의미가 유지되는가 |

각 항목은 0~10점으로 평가합니다.

- `O`: 8~10점
- `조건부 O`: 원인 확인 항목에만 적용, 8점
- `△`: 5~7점
- `X`: 0~4점

10개 항목이 모두 `O`여야 최종 후보로 제시합니다. 원인 확인의 `조건부 O`는 통과로 인정합니다. 내부에서는 후보를 폭넓게 찾되 결과 화면에는 점수가 높은 순서로 최대 5개만 보여줍니다. 5개를 채우지 못하면 7일 범위 안에서 두 차례 재탐색하고, 그래도 부족하면 기준을 낮추지 않고 통과한 후보만 제시합니다.

보도량, 조회수, 좋아요 수로 후보를 거르지 않습니다. 다만 최종 야마가 기존 기사에서 반복된 결론인지 확인합니다. 새 FACT가 기존 설명의 변화, 반전, 예외나 임계점을 보여주지 못한다면 후보에서 제외합니다.

---

## 설치

사용하는 도구에 맞는 스킬 파일과 PDF 템플릿, 변환 스크립트를 설치하면 됩니다.

### Claude Code

```bash
mkdir -p ~/.claude/skills/hb ~/.claude/agents
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.claude/skills/hb/SKILL.md \
  -o ~/.claude/skills/hb/SKILL.md
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.claude/agents/hb-agent.md \
  -o ~/.claude/agents/hb-agent.md
```

### Cursor

```bash
mkdir -p ~/.cursor/skills/hb ~/.cursor/agents
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.cursor/skills/hb/SKILL.md \
  -o ~/.cursor/skills/hb/SKILL.md
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.cursor/agents/hb-agent.md \
  -o ~/.cursor/agents/hb-agent.md
```

### Codex

```bash
mkdir -p ~/.agents/skills/hb ~/.agents/agents
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.agents/skills/hb/SKILL.md \
  -o ~/.agents/skills/hb/SKILL.md
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.agents/agents/hb-agent.md \
  -o ~/.agents/agents/hb-agent.md
```

### PDF 출력 파일

PDF를 자동으로 만들려면 템플릿과 변환 스크립트도 설치해야 합니다.

```bash
BASE=https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main
SKILL=~/.claude/skills/hb  # Cursor: ~/.cursor/skills/hb, Codex: ~/.agents/skills/hb

mkdir -p $SKILL/templates $SKILL/scripts
curl -fsSL $BASE/templates/report.html -o $SKILL/templates/report.html
curl -fsSL $BASE/scripts/make-pdf.ps1 -o $SKILL/scripts/make-pdf.ps1
curl -fsSL $BASE/scripts/make-pdf.sh -o $SKILL/scripts/make-pdf.sh
chmod +x $SKILL/scripts/make-pdf.sh
```

템플릿이 없어도 스킬은 실행됩니다. 이 경우 인라인 CSS로 HTML을 만들며, PDF 변환기를 찾지 못하면 HTML을 남기고 브라우저 인쇄 방법을 안내합니다.

### 웹 AI

[`PROMPT.md`](./PROMPT.md)의 지침을 프로젝트 지침, Custom GPT Instructions 또는 Gem 지침에 붙여넣습니다.

설치 후 스킬이 보이지 않으면 Claude Code와 Codex는 다시 시작하고, Cursor는 `Reload Window`를 실행합니다.

---

## 사용법

| 도구 | 호출 방법 |
|---|---|
| Claude Code | `/hb` |
| Cursor | `/hb` |
| Codex | `$hb` 또는 `/skills` |
| 웹 AI | `/hb` 또는 “발제 뽑아줘” |

```text
/hb
/hb 배터리 쪽으로만
/hb 조선과 방산 중심으로 발제 찾아줘
```

기본 탐색 업종은 항공, 석화, 조선, 배터리, 전선, 정유, 석유화학, LCC항공이며 대기업을 중심으로 봅니다. 도메인을 변경하면 CLI 환경에서는 설정 파일에 저장해 다음 호출에도 적용합니다.

---

## 결과물

CLI가 접근할 수 있는 작업 폴더 아래에 `HB_Output`을 만들고 PDF와 HTML을 저장합니다.

```text
<작업폴더>/HB_Output/2026_08_12_2246output.pdf
<작업폴더>/HB_Output/2026_08_12_2246output.html
```

파일명은 `YYYY_MM_DD_HHmmoutput` 형식입니다. 같은 분에 다시 실행해 이름이 겹치면 `_2`, `_3`을 붙이며 기존 결과를 덮어쓰지 않습니다. 폴더를 만든 뒤 실제 존재 여부를 확인하므로 권한 문제로 파일이 조용히 사라지는 일을 줄였습니다.

PDF에는 다음 내용이 들어갑니다.

1. 생성 시각, 탐색 기간, 도메인
2. 최종 발제 후보와 10개 판정표, 점수, 순위
3. 각 후보의 트리거, 독립 근거, 시간축, 반론, 출처
4. 사용자가 선택한 발제의 추가 검증 결과
5. 제목, 부제, 완성 기사
6. 기사에 사용한 전체 출처

---

## 함께 제공되는 조사 에이전트

`hb-agent`는 업종과 기업별 자료 수집을 나눠 맡는 읽기 전용 에이전트입니다.

- `GATHER`: 원문을 열어 날짜와 수치를 확인하고 사실 목록을 정리합니다.
- `CHALLENGE`: 발제의 가장 강한 반론을 찾아 `SURVIVES`, `WEAKENED`, `COLLAPSES`로 판정합니다.

업종이 많거나 비교할 기업이 여러 곳일 때 조사 시간을 줄이는 데 도움이 됩니다.

## 저장소 구성

```text
.claude/skills/hb/SKILL.md      Claude Code용 스킬
.claude/agents/hb-agent.md      Claude Code용 조사 에이전트
.cursor/skills/hb/SKILL.md      Cursor용 스킬
.cursor/agents/hb-agent.md      Cursor용 조사 에이전트
.agents/skills/hb/SKILL.md      Codex용 스킬
.agents/agents/hb-agent.md      Codex용 조사 에이전트
PROMPT.md                       웹 AI용 지침
templates/report.html           A4 PDF 리포트 템플릿
scripts/make-pdf.ps1            Windows PDF 변환 스크립트
scripts/make-pdf.sh             macOS·Linux PDF 변환 스크립트
config/domains.default.json     기본 산업 도메인
```

## 알아둘 점

- 웹 검색 기능이 없으면 최신 자료를 검증할 수 없습니다. 이 경우 내용을 만들어내지 않고 검색이 불가능하다고 알립니다.
- 유료 기사나 비공개 리포트만으로는 핵심 FACT를 확정하지 않습니다.
- 스킬은 발제 후보와 검증 자료를 정리하지만, 최종 기사 가치와 게재 여부는 사용자가 판단합니다.

---

**License: MIT**
