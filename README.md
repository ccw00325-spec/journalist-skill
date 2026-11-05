<p align="center"><img src="assets/ai-skill-banner.jpg" alt="AI Skill — Built for Real Work, Not Just Demos" width="100%"></p>

# 산업 일일 발제 도우미 (HB)

최근 7일의 공시와 기사에서 평소와 다른 사실을 찾아, 공개 자료로 검증한 발제 후보를 내는 AI 스킬입니다. 사용자가 고른 발제만 기사와 PDF로 완성합니다.

Claude Code, Cursor, Codex에서 쓸 수 있고, 웹 AI에서는 프롬프트로 쓸 수 있습니다.

## 어떤 문제를 푸나요

AI에게 "기사 아이템 찾아 줘"라고 하면 보통 기존 기사의 요약이나, 출처 없이 그럴듯한 문장이 나옵니다. 데스크에 그대로 올릴 수 없습니다.

HB는 이런 결과가 나오지 않도록 절차를 막아 둡니다.

- **요약 차단**: 트리거 기사 밖에서 독립 근거를 2건 이상 찾아야 합니다.
- **추측 차단**: 사실 문장마다 출처를 붙이고, 수치마다 실적·전망·계획 같은 성격을 표시합니다.
- **혼자 결정 차단**: 세 지점에서 멈추고 사용자의 답을 기다립니다.

## 장점

- **요약이 아니라 발제를 만듭니다.** 기사 속 사실 하나를 질문으로 바꾸고 원문 밖 자료로 확인합니다.
- **출처를 따라가 볼 수 있습니다.** 근거마다 매체, 제목, 날짜, 주소가 붙습니다. 공시가 있으면 보도보다 원문을 우선합니다.
- **숫자를 같은 기준으로 봅니다.** 기간, 단위, 범위가 다르면 억지로 견주지 않습니다.
- **반론을 먼저 찾습니다.** 계절성, 기업 특수 사정, 반대 사례를 실제로 검색합니다.
- **결정은 사람이 합니다.** 범위, 발제, 기사화 여부를 사용자가 정합니다.

## 작동 흐름

```text
/hb
 → 현재 시각과 최근 7일 범위 확인
 → [GATE 1] 사용자가 탐색 업종을 정합니다
 → 기사·공시·통계 탐색, 평소와 다른 사실 찾기
 → 독립 근거, 기준선, 반론 대조
 → 10개 기준을 모두 통과한 후보를 점수순으로 최대 5건 제시
 → [GATE 2] 사용자가 발제를 고릅니다
 → 추가 조사와 확정 판정
 → [GATE 3] 사용자가 기사화를 승인합니다
 → 기사 작성, PDF·HTML 출력
```

트리거는 최근 7일 안의 자료로만 잡습니다. 후보가 모자라도 기간을 늘리거나 기준을 낮추지 않고, 같은 기간 안에서 다시 찾습니다. 과거 비교와 반론 자료에는 기간 제한이 없습니다.

## 설치

Node는 새 도구를 쓸 때만 필요합니다. 스킬만 쓴다면 첫 번째 단계로 충분합니다.

**1. 스킬 설치** (`TOOL` 은 `.claude`, `.cursor`, `.agents` 중 하나입니다)

```bash
TOOL=.claude
BASE=https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main
mkdir -p ~/$TOOL/skills/hb ~/$TOOL/agents
curl -fsSL $BASE/$TOOL/skills/hb/SKILL.md -o ~/$TOOL/skills/hb/SKILL.md
curl -fsSL $BASE/$TOOL/agents/hb-agent.md -o ~/$TOOL/agents/hb-agent.md
```

**2. PDF 출력과 새 도구 설치** (선택)

```bash
SKILL=~/$TOOL/skills/hb
mkdir -p $SKILL/templates $SKILL/scripts $SKILL/config
for f in templates/report.html scripts/make-pdf.ps1 scripts/make-pdf.sh \
         scripts/collect-signals.mjs scripts/score-challenge.mjs scripts/check-failure-patterns.mjs \
         config/collector.sources.json config/industry-templates.json; do
  curl -fsSL $BASE/$f -o $SKILL/$f
done
```

이 파일이 없어도 스킬은 실행됩니다. 없는 도구의 단계만 건너뜁니다.

**웹 AI**: [`PROMPT.md`](./PROMPT.md)의 지침을 프로젝트 지침이나 Custom GPT Instructions, Gem 지침에 붙여 넣으세요. 셸이 없어 새 도구는 쓸 수 없습니다.

스킬이 보이지 않으면 Claude Code와 Codex는 다시 시작하고, Cursor는 `Reload Window`를 실행해 주세요.

## 첫 실행과 호출 예시

| 도구 | 호출 |
|---|---|
| Claude Code, Cursor | `/hb` |
| Codex | `$hb` 또는 `/skills` |
| 웹 AI | `/hb` 또는 "발제 뽑아줘" |

```text
/hb
/hb 배터리 쪽으로만
/hb 조선 중심으로 발제 찾아줘
```

첫 실행에서는 현재 시각과 탐색 범위를 보여 주고 어느 업종을 볼지 묻습니다. 답하면 탐색을 시작합니다. 기본 업종은 항공, 석화, 조선, 배터리, 전선, 정유, 석유화학, LCC항공이고 대기업 중심입니다.

결과는 작업 폴더의 `HB_Output/` 에 PDF와 HTML로 저장합니다. 기존 파일은 덮어쓰지 않습니다.

## 새 기능

세 도구 모두 Node 표준 라이브러리만 씁니다. 아래 명령은 저장소를 받은 폴더에서 실행하는 예시이고, 스킬로 쓸 때는 SKILL이 알맞은 단계에서 호출합니다.

### 공시·기사 수집

DART 공시, 경제지 RSS, 통계 발표 일정을 모아 이상 신호 후보를 만듭니다.

```bash
node scripts/collect-signals.mjs
```

- 결과는 전부 **본문 확인 전 후보**입니다. 원문을 열어 확인한 것만 근거로 씁니다.
- 실시간이 아니라 돌린 시점에 모으는 주기 수집입니다. 웹 검색을 대신하지 않습니다.
- DART 키는 환경변수 `DART_API_KEY` 로만 받습니다. 없으면 공시를 건너뛰었다고 적고 나머지를 모읍니다.
- 일부 언론사는 RSS 이용을 제한합니다. 제한 문구를 확인한 피드는 기본으로 꺼 두었고, 주소를 확인하지 못한 피드는 빈 칸으로 두었습니다.

키 등록, 예약 실행, 피드 조건은 [`docs/신호_수집.md`](docs/신호_수집.md)를 봐 주세요.

### 산업별 팩트 템플릿

조선, 배터리, 정유, 석유화학, 항공, 전선의 지표 정의와 단위, 비교 기준, 흔한 오독을 [`config/industry-templates.json`](config/industry-templates.json)에 모았습니다. 공통 10체크는 그대로 두고 수치를 판정할 때 대조합니다. 수치 예시는 넣지 않았고, 정의를 어디까지 확인했는지 지표마다 표시했습니다. 자세한 내용은 [`docs/산업별_템플릿.md`](docs/산업별_템플릿.md)에 있습니다.

### 반론 근거 점수와 과거 실패 대조

```bash
node scripts/score-challenge.mjs --input 반론결과.json
node scripts/check-failure-patterns.mjs check --input 후보.json --log hb/failure-log.jsonl
```

- **근거 점수**는 `SURVIVES`, `WEAKENED`, `COLLAPSES` 판정 옆에 붙습니다. 반론 출처의 티어, 수치 재현, 거시 변수 통제, 비교 기준을 규칙으로 계산합니다. 야마가 옳은지를 재는 점수가 아닙니다.
- **실패 대조**는 사람이 적은 오발제·실패 기획 기록과 새 후보를 규칙으로 비교해 경고합니다. 학습하지 않습니다. 처음에는 기록이 비어 있고, 빈 상태에서도 동작합니다.
- 어느 쪽도 후보를 자동으로 통과시키거나 탈락시키지 않습니다. 세 번의 사용자 게이트는 그대로입니다.

규칙과 기록 형식은 [`docs/반론_점수와_실패_대조.md`](docs/반론_점수와_실패_대조.md)에 있습니다.

### 시험

```bash
npm test
```

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

각 항목을 0~10점으로 평가해 100점으로 환산합니다. 10개가 모두 `O`(8점 이상)여야 후보로 제시합니다. 회사가 원인을 직접 밝히지 않은 경우에는 독립 자료 2건 이상과 반대 정황을 확인했을 때만 4번을 `조건부 O`로 남기며, 정황을 원인으로 단정하지 않습니다.

## 저장소 구성

```text
.claude/ .cursor/ .agents/       도구별 스킬과 조사 에이전트(hb-agent)
PROMPT.md                        웹 AI용 지침
templates/report.html            PDF 리포트 템플릿
scripts/make-pdf.ps1, make-pdf.sh  PDF 변환
scripts/collect-signals.mjs      공시·기사·일정 후보 수집
scripts/score-challenge.mjs      반론 근거 점수
scripts/check-failure-patterns.mjs  과거 실패 대조
config/domains.default.json      기본 업종
config/collector.sources.json    수집 소스와 키워드
config/industry-templates.json   산업별 지표 점검표
docs/                            새 기능 설명
test/                            시험
```

## 한계

- 웹 검색이 없으면 최신 자료를 검증할 수 없습니다. 이때는 내용을 만들지 않고 검색이 불가능하다고 알립니다.
- 유료 기사나 비공개 리포트만으로는 핵심 사실을 확정하지 않습니다.
- 수집 도구는 문자열로 후보를 거를 뿐, 무엇이 평소와 다른지 판단하지 않습니다. 놓치는 공시와 기사가 있을 수 있습니다.
- DART 수집은 공식 가이드 형식에 맞춘 가짜 응답으로 시험했습니다. 실제 키로 돌려 본 적은 없습니다.
- 점수의 배점과 경고 기준은 실제 기사 데이터로 검증하지 않은 규칙입니다. 입력이 틀리면 점수도 틀립니다.
- 산업 템플릿의 일부 정의는 공식 문서를 끝까지 확인하지 못했습니다. `verification` 값을 먼저 봐 주세요.
- 최종 기사 가치와 게재 여부는 사용자가 판단합니다.
- 영어 안내([`README.en.md`](README.en.md))에는 이번 기능이 반영되어 있지 않습니다.

## 라이선스

Apache License 2.0을 적용합니다. 저작권은 Chan Woo Cho ([@ccw00325-spec](https://github.com/ccw00325-spec))에게 있습니다. 재배포할 때는 Apache 2.0 제4조에 따라 저작권과 출처 고지를 보존해야 합니다. [LICENSE](LICENSE) · [NOTICE](NOTICE)
