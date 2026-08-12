# HB Skill — Industry Story-Pitch & Article Pipeline

An AI skill that reproduces how a 20-year senior industry-desk reporter actually works. **It takes one fact out of a trigger story published within the last 7 days, builds a new angle on it, backs that angle with at least two independent pieces of evidence found *outside* the trigger story, stress-tests it against the strongest counterargument, and writes the finished article.** The deliverable is a PDF containing every pitch candidate plus the final article.

Works in Claude Code, Cursor, Codex, and web AI (Claude.ai, ChatGPT, Gemini).

---

## Why

Ask an AI to "find me a story idea" and you usually get one of two things: a summary of an existing article, or something plausible with no sourcing. Neither survives a desk edit.

This skill blocks both structurally.

- **Against summarizing** — the two supporting facts must come from *outside* the trigger article, from a different actor or a different data source. Rearranging what's already in the story fails the check.
- **Against speculation** — every factual sentence carries outlet, headline, publication timestamp, and URL. Every number carries an `[actual] [forecast] [plan] [interim]` tag. Hedge-speculation phrasing is a banned construction.
- **Against deciding alone** — three gates halt the pipeline and hand the decision back to the user.

---

## Pipeline

```
/hb → [STEP 0  resolve real system time · load domains]
    → ⟦GATE 1⟧ confirm domain & window ............... waits for user
    → [STEP 1  source sweep — T1 wires → T1+ institutional → T2 majors → T3 rest]
    → [STEP 2  5–8 pitch candidates, each with 2+ independent grounds]
    → ⟦GATE 2⟧ user picks the pitch .................. waits for user
    → [STEP 3  deepen evidence + 7-check adversarial verification]
    → ⟦GATE 3⟧ lock the angle, approve write-up ...... waits for user
    → [STEP 4  write the article] → [STEP 5  render PDF]
```

### Source tiers

| Tier | Sources | Role |
|------|---------|------|
| **T1** | Yonhap · Newsis · News1 / Reuters · AP | Breaking, first-hand. Triggers come from here first |
| **T1+** | Institutional reports, statistics, sell-side research, DART filings | Numeric backbone and like-for-like comparison |
| **T2** | Chosun · JoongAng · Dong-A · Hankook · Hankyoreh · Kyunghyang · MK · Hankyung | Depth, analysis, company comment |
| **T3** | Everything else | Gap-filling |

### The 7 checks

| # | Check | Passes when |
|---|-------|-------------|
| 1 | Clear trigger | A dated event/filing/announcement within the last 7 days |
| 2 | 2+ independent grounds | Absent from the trigger story; different actor or data source |
| 3 | Number typing | Every figure tagged actual / forecast / plan / interim |
| 4 | Verified causation | Company behavior explained by filings, statistics, or company statements |
| 5 | Like-for-like comparison | Same period, unit, consolidated/standalone basis, FX |
| 6 | Survives the strongest counter | The angle holds after the hardest rebuttal is applied first |
| 7 | Stands on public evidence | Does not depend on "we'd know if we reported it out" |

Check 6 is not performed pro forma. The skill **actually searches for opposing evidence**, and if the angle collapses it reports that and offers to return to GATE 2.

---

## Install

> Fetch only the files for the tool you use — no need to clone the whole repo. If you already have the files locally, copying is faster.

### Personal scope — all projects (recommended)

**Claude Code**
```bash
mkdir -p ~/.claude/skills/hb ~/.claude/agents
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.claude/skills/hb/SKILL.md \
  -o ~/.claude/skills/hb/SKILL.md
curl -fsSL https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main/.claude/agents/hb-agent.md \
  -o ~/.claude/agents/hb-agent.md
```

**Cursor** — same paths under `~/.cursor/skills/hb/` and `~/.cursor/agents/`.

**Codex** — same paths under `~/.agents/skills/hb/` and `~/.agents/agents/`.

**PDF assets (required for curl installs — same for all three tools)**

`SKILL.md` alone will not produce a PDF at STEP 5. Fetch the template and the converter too.

```bash
BASE=https://raw.githubusercontent.com/ccw00325-spec/journalist-skill/main
SKILL=~/.claude/skills/hb        # ~/.cursor/skills/hb for Cursor, ~/.agents/skills/hb for Codex

mkdir -p $SKILL/templates $SKILL/scripts
curl -fsSL $BASE/templates/report.html  -o $SKILL/templates/report.html
curl -fsSL $BASE/scripts/make-pdf.ps1   -o $SKILL/scripts/make-pdf.ps1   # Windows
curl -fsSL $BASE/scripts/make-pdf.sh    -o $SKILL/scripts/make-pdf.sh    # macOS · Linux
chmod +x $SKILL/scripts/make-pdf.sh
```

Skipping this does not break the skill: without the template it builds HTML with inlined CSS, and without a converter it keeps the HTML and tells you to print from the browser. The layout will just differ between runs.

**Web AI** — paste the block in [`PROMPT.md`](./PROMPT.md) into project instructions / Custom GPT Instructions / Gem instructions.

### Project scope

Replace `~/` with `.` (repo root).

### After installing

- **Claude Code** — live reload; restart if you created `.claude/skills/` mid-session
- **Cursor** — Reload Window
- **Codex** — restart if the skill isn't detected

---

## Usage

| Tool | Invoke |
|------|--------|
| Claude Code | `/hb` |
| Cursor | `/hb` |
| Codex | `$hb` or `/skills` |
| Web AI | `/hb` or "find me a story pitch" |

```
/hb
/hb batteries only
/hb shipbuilding and defense, last 3 days
```

Domain changes persist to `~/.claude/hb/domains.json` and apply to later calls. (In the web version, edit the `[도메인]` line in your project instructions.)

**Default domains:** aviation · petrochemicals · shipbuilding · batteries · wire & cable · refining · LCC airlines — large-cap focus.

---

## Output

Written to `HB_Output/` directly under the working directory the CLI was granted access to.

```
<workdir>/HB_Output/2026_08_12output.pdf
<workdir>/HB_Output/2026_08_12output.html    ← source, for edits and re-renders
```

Filenames follow `YYYY_MM_DDoutput`. A second run on the same day becomes `2026_08_12output_2.pdf` — earlier reports are never overwritten.

The directory is created with `mkdir` and then verified before anything is written. If creation fails (unwritable location, missing permission) the skill stops and says so, rather than writing files into a directory that does not exist.

1. **Cover** — generation time, search window, domains, candidate count
2. **All pitch candidates** — including the ones not chosen, with `★` on the selected one. Each carries the angle, the highlighted fact, the trigger source with **publication date and time**, and each supporting fact with its own source
3. **Verification** — locked angle, 7-check table, strongest counter and rebuttal
4. **Finished article** — headline, deck, full body
5. **Reference list** — numbered, complete

PDF rendering uses headless Chrome/Edge — no external dependencies, no broken Korean glyphs. On failure the skill points you to the HTML so you can print to PDF from the browser.

---

## Companion sub-agent

`hb-agent` — read-only, two modes:

- **GATHER** — sweeps a given sector/company/window in tier order, opens each source to confirm timestamps and figures, returns a structured fact list
- **CHALLENGE** — hunts real opposing evidence for a given angle and returns `SURVIVES / WEAKENED / COLLAPSES`

Run several in parallel when the sweep spans multiple sectors or peer companies.

---

## Repository layout

```
.claude/skills/hb/SKILL.md      Claude Code skill (canonical)
.claude/agents/hb-agent.md      Claude Code sub-agent
.cursor/skills/hb/SKILL.md      Cursor skill
.cursor/agents/hb-agent.md      Cursor sub-agent
.agents/skills/hb/SKILL.md      Codex skill
.agents/agents/hb-agent.md      Codex sub-agent
PROMPT.md                       Web-AI prompt edition
templates/report.html           PDF report template (inlined CSS, A4)
scripts/make-pdf.ps1            HTML → PDF, Windows
scripts/make-pdf.sh             HTML → PDF, macOS · Linux
config/domains.default.json     Default industry domains
```

Don't clone the whole repo into your working project — take only the files for the tool you use.

---

## Limits

- **No web search, no pipeline.** In a sandbox without search the skill stops and says so rather than inventing pitches.
- **Paywalled articles and private research are out of reach** — which is exactly why check 7 exists.
- **A human still decides.** The skill builds a verifiable skeleton; it does not replace the desk.

---

**License:** MIT
