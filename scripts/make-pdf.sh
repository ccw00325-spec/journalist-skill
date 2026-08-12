#!/usr/bin/env bash
# HB 발제 리포트 HTML을 PDF로 변환한다 (Chrome/Chromium/Edge headless).
#
#   ./make-pdf.sh ./HB_Output/2026_08_12output.html
#   ./make-pdf.sh ./report.html ./report.pdf
#
# 종료 코드: 0 성공 / 1 변환 실패 / 2 브라우저 없음 (둘 다 HTML 경로를 안내)

set -uo pipefail

HTML="${1:-}"
PDF="${2:-}"

if [ -z "$HTML" ]; then
  echo "사용법: $(basename "$0") <html 경로> [pdf 경로]" >&2
  exit 1
fi

if [ ! -f "$HTML" ]; then
  echo "HTML 파일을 찾을 수 없습니다: $HTML" >&2
  exit 1
fi

# 절대 경로로 (file:// URI 용)
if command -v realpath >/dev/null 2>&1; then
  HTML="$(realpath "$HTML")"
else
  HTML="$(cd "$(dirname "$HTML")" && pwd)/$(basename "$HTML")"
fi

[ -n "$PDF" ] || PDF="${HTML%.*}.pdf"
mkdir -p "$(dirname "$PDF")"

# 브라우저 탐색 — PATH 우선, 그다음 macOS 앱 번들
BROWSER=""
for c in google-chrome google-chrome-stable chromium chromium-browser \
         microsoft-edge microsoft-edge-stable brave-browser; do
  if command -v "$c" >/dev/null 2>&1; then BROWSER="$(command -v "$c")"; break; fi
done

if [ -z "$BROWSER" ]; then
  for p in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium" \
           "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
           "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"; do
    if [ -x "$p" ]; then BROWSER="$p"; break; fi
  done
fi

if [ -z "$BROWSER" ]; then
  echo "경고: Chrome/Chromium/Edge를 찾지 못했습니다." >&2
  echo "      HTML을 브라우저에서 열고 Ctrl+P(⌘P) → 'PDF로 저장'을 사용하세요." >&2
  echo "HTML: $HTML"
  exit 2
fi

PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/hb-pdf-XXXXXX")"
trap 'rm -rf "$PROFILE"' EXIT

"$BROWSER" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --no-first-run \
  --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=10000 \
  --user-data-dir="$PROFILE" \
  --print-to-pdf="$PDF" \
  "file://$HTML" >/dev/null 2>&1

if [ -f "$PDF" ]; then
  SIZE="$(du -k "$PDF" | cut -f1)"
  echo "PDF 생성 완료: $PDF (${SIZE} KB)"
  echo "HTML 원본:    $HTML"
else
  echo "경고: PDF 생성 실패. HTML을 브라우저에서 열고 Ctrl+P(⌘P) → 'PDF로 저장'을 사용하세요." >&2
  echo "HTML: $HTML"
  exit 1
fi
